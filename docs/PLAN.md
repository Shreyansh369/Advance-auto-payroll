# Payroll System – Build Plan

Private, single-owner, multi-company payroll system for the British Virgin Islands (BVI).
Not commercial / not multi-tenant SaaS. Company name and logo to be supplied later.

Status: **planning – no code written yet.** Items marked ❓ need a decision or confirmation
before (or during) the phase that depends on them.

---

## 1. Recommended technology

| Concern | Choice | Why |
|---|---|---|
| Language / framework | Python 3.12 + Django 5 | Mature auth, permissions, forms, admin, migrations; very little custom security plumbing |
| Database | PostgreSQL 16 | Exact `NUMERIC` money math, transactions, row-level security as a second isolation layer |
| UI | Server-rendered Django templates + HTMX + Tailwind | Fast, simple, no separate SPA to secure; works well for data-entry grids |
| Money math | Python `Decimal` everywhere, never floats; explicit rounding rules | Payroll must reconcile to the cent |
| PDFs | WeasyPrint (HTML → PDF) | Branded payslips/reports from templates; logo dropped in later |
| Excel / CSV | openpyxl / csv | Report exports, QuickBooks import files |
| 2FA | django-otp (TOTP authenticator app) | Required for a system holding salaries and ID numbers |
| Audit history | django-simple-history + custom append-only audit log | Field-level "who changed what, when, old → new" |
| Background jobs | Django-Q or Celery (light) | Bulk payslip generation / ZIP downloads |
| Tests | pytest + "golden" worked payroll examples | Every statutory/rate formula locked by tests |
| Deployment | Docker Compose on a private VPS, Caddy for automatic HTTPS | One small server, cheap, easy to back up |
| Backups | Nightly encrypted `pg_dump` + file storage to off-site bucket, restore tested | Payroll records must survive server loss |

❓ Confirm stack and hosting (private VPS vs. local office machine vs. cloud PaaS).

---

## 2. Architecture & data separation

- One database; **every business record carries `company_id`**.
- A request-level "active company" (company switcher in the top bar). All queries go through
  company-scoped managers; any record from another company returns 404.
- PostgreSQL row-level security as defence-in-depth, plus automated tests that try to read
  across companies.
- Users have a **membership per company with a role**, so access can differ per company.

### Roles (per company)
- **Owner/Admin** – everything, including settings, statutory tables, unlocking.
- **Payroll Processor** – enter data, calculate, submit for review.
- **Approver** – approve/finalize; authorize leave adjustments and corrections.
- **Viewer / Accountant** – read-only reports and exports.

---

## 3. Core data model (high level)

- **Company** – legal name, address, logo, BVI registration numbers (Social Security employer
  no., NHI no., Payroll Tax no.), payroll-tax employer class, GL account mapping, default
  pay schedule, daily-rate method, overtime rules, leave policies, public-holiday calendar.
- **Employee** – personal info, IDs (SS no., NHI no.), DOB, hire/termination dates,
  department, job title, payment method + bank details (encrypted), status.
- **Employment / Pay record (effective-dated)** – pay type (salaried/hourly), salary or hourly
  rate, pay frequency, overtime eligibility, statutory flags. History kept; never overwritten.
- **Work schedule (effective-dated)** – working days of week, hours per day, hours per week.
- **Pay schedule & calendar** – weekly / biweekly / semi-monthly / monthly; period start/end,
  pay date; auto-generated for the year.
- **Earning types** – regular, hourly, overtime (×1.5, ×2 …), commission, bonus, allowances,
  holiday pay, back-pay, etc. Each flagged: subject to Social Security? NHI? Payroll Tax?
  recurring or one-time? GL account.
- **Deduction types** – loans, advances, unpaid absence, other recurring/one-time; GL account.
- **Recurring items** – per-employee standing allowances/deductions with start/end dates.
- **Loans & advances** – principal, repayment per period, balance, schedule, pause/resume.
- **Leave types & policies** – sick, vacation/annual, unpaid sick, unpaid leave, other; paid
  vs unpaid; entitlement; accrual method; carry-over.
- **Leave ledger** – every entitlement, accrual, usage, adjustment, carry-over and expiry is an
  immutable transaction ⇒ balances are always derivable and history is permanent.
- **Statutory schemes (effective-dated)** – rates, ceilings (per period and/or annual),
  exemptions, age rules, employer class rates.
- **Payroll run** – company, period, status, totals; **payroll line** per employee;
  **line items** per earning/deduction/statutory amount with the inputs used (rate, qty,
  formula snapshot).
- **Audit log** – user, timestamp, company, object, action, before/after, reason.

---

## 4. Rate calculations (salaried)

Derived automatically from salary + effective work schedule; stored as a snapshot on each
payroll line so later changes never alter historical payslips.

```
Annual  = salary entered (or monthly × 12, etc.)
Monthly = Annual / 12
Weekly  = Annual / 52
Daily   = Annual / (working days per week × 52)
Hourly  = Annual / (hours per week × 52)
```

Example – $2,000/month, Mon–Fri, 8 h/day (40 h/week):
- Annual $24,000.00 · Monthly $2,000.00 · Weekly $461.54
- Daily = 24,000 / 260 = **$92.31** · Hourly = 24,000 / 2,080 = **$11.54**
- Unpaid sick leave 2 days ⇒ deduction **2 × $92.31 = $184.62**

Period base pay: weekly = Annual/52, biweekly = Annual/26, semi-monthly = Annual/24,
monthly = Annual/12.

❓ Daily-rate method per company: the "annual ÷ working days" method above (consistent all
year) **or** "monthly ÷ actual working days in that month" (varies month to month). Default
proposed: the first.

Hourly employees: hours × rate; daily/weekly/annual equivalents shown for information.

---

## 5. Payroll calculation order

1. Base pay for the period (salary portion or hours × rate), pro-rated for mid-period hire/exit.
2. Add overtime, commissions, bonuses, allowances (recurring + one-time).
3. Subtract unpaid absence (pulled automatically from unpaid leave in the period/unprocessed).
4. Gross pay.
5. Determine insurable/taxable earnings per scheme from earning-type flags.
6. Statutory – employee and employer – applying ceilings using YTD figures:
   - Social Security, NHI, Payroll Tax (incl. annual exemption and employer class).
7. Other deductions: loans/advances, recurring, one-time.
8. Net pay (guarded: can't go below zero / a configured minimum; excess deductions carried
   forward with a warning).
9. Employer cost = gross + employer statutory contributions.

### BVI statutory defaults to seed (effective-dated, editable – ❓ to be confirmed by accountant)

| Scheme | Employee | Employer | Ceiling / rule |
|---|---|---|---|
| Social Security | 4% | 4.5% | Max insurable earnings US$53,400/yr from 1 Jan 2026 (US$51,000 in 2025) |
| NHI | 3.75% | 3.75% | Max insurable earnings US$106,800/yr from 1 Jan 2026 (2 × SS ceiling) |
| Payroll Tax | 8% | 2% (Class 1 small employer) / 6% (Class 2) | First US$10,000 of annual remuneration per employee exempt |

Class 1 = 7 or fewer employees, annual payroll ≤ $150,000 and turnover ≤ $300,000 (to confirm).

---

## 6. Payroll workflow & controls

`Draft → Calculated → In Review → Approved → Finalized (Locked) → Paid`

- **Review screen** per employee: base, each earning, **unpaid-absence deduction with the
  days × daily rate shown**, statutory employee/employer, other deductions, net, YTD,
  variance vs. last period (flags big changes).
- Approve/finalize locks the run: no edits to its lines, leave used in it, or rates applied.
- **Corrections**: never edit a locked run. Either (a) an off-cycle correction run, or
  (b) an adjustment line carried into the next run. Re-opening a locked run is Owner-only,
  requires a reason, and is audit-logged.
- Off-cycle runs (bonus run, final pay, correction).
- Full history by employee and by company; YTD on every payslip.

---

## 7. Leave & attendance

- Record: date range, days or hours (incl. half days), type, paid/unpaid, notes, attachment
  (e.g. medical certificate).
- Balances per type: entitlement, used, remaining, pending, history.
- Manual adjustments (Approver/Owner only, reason required, audit-logged).
- Unpaid leave automatically creates a pending deduction picked up by the next payroll run;
  once that run is finalized the leave record is linked to it and locked.
- Leave records retained permanently after payroll closes.

---

## 8. Payslips, reports & exports

- Individual PDF payslips (branded, logo later); bulk download as ZIP or one combined PDF.
- Payroll register, payroll summary, employee earnings/deduction history, leave/absence
  report, vacation & sick balances, Social Security report, NHI report, Payroll Tax report,
  employer payroll cost report.
- Every report: filters (company, period, date range, employee, department) and
  PDF / Excel / CSV export.
- **QuickBooks Online**: per-run journal entry (gross wages, employer contributions,
  liabilities for each scheme, loan receivables, net pay clearing) using a per-company GL
  account map; exported as a QBO-importable CSV. Optional phase: direct QBO API posting.

---

## 9. Security

- HTTPS only, strong passwords, mandatory TOTP 2FA, session timeout, login throttling.
- Encryption of sensitive fields (bank accounts, ID numbers) at rest.
- Per-company role permissions; append-only audit log incl. logins and exports.
- Encrypted off-site backups, tested restores; minimal open ports; automatic OS updates.

---

## 10. Phased delivery

| Phase | Scope |
|---|---|
| 0 | Confirm decisions & BVI rules (this document) |
| 1 | Project setup, auth + 2FA, companies, company switcher, roles, audit log, branding hooks |
| 2 | Employees, effective-dated pay & schedule, rate calculator, pay schedules/calendars, holidays |
| 3 | Statutory engine (effective-dated tables) + golden tests |
| 4 | Leave types, policies, ledger, balances, unpaid → payroll link |
| 5 | Payroll runs: inputs/time entry, recurring items, loans, calculation, review, approve, lock, corrections, off-cycle |
| 6 | Payslips (PDF/ZIP), all reports, Excel/CSV/PDF exports, QuickBooks journal export |
| 7 | Opening balances import (YTD + leave), parallel run vs current payroll, deployment, backups, handover |

---

## 11. Gaps / additional requirements identified

1. **Company statutory setup** – SS employer no., NHI no., Payroll Tax no., employer class
   (2% vs 6%), legal address, fiscal year.
2. **Employee identifiers** – SS no., NHI no., date of birth (age rules), nationality,
   work-permit no. & expiry, hire/termination dates, department, job title.
3. **How employees are paid** – bank transfer / cheque / cash; bank details; a bank payment
   file or bank transfer list; split payments.
4. **BVI public holidays** – calendar per year; holiday pay; premium for working a holiday;
   holidays excluded from leave days used.
5. **Overtime rules** – daily/weekly thresholds (e.g. >8 h/day, >40 h/week), multipliers
   (1.5×, 2× for rest days/holidays), whether salaried staff qualify.
6. **Time entry for hourly staff** – grid entry per period and/or CSV import of timesheets.
7. **Pro-rating** – new hires, terminations, unpaid periods, pay-rate changes mid-period.
8. **Termination / final pay** – severance per BVI Labour Code, notice pay, payout of unused
   vacation, recovery of outstanding loans.
9. **Pay-rate history & back pay** – effective-dated raises, retroactive pay calculation.
10. **Leave policy details** – accrual (up-front vs per pay period), leave year (calendar vs
    hire anniversary), carry-over limits/expiry, probation rules, half days, negative balances,
    maternity/paternity, bereavement, compassionate, jury duty; medical certificate rule.
11. **Statutory details to confirm** – ceilings applied per pay period vs annually (YTD);
    how the $10,000 payroll-tax exemption is applied (spread per period vs first-$10k);
    rules for employees above pension age or under 16; which earnings (allowances,
    bonuses, benefits-in-kind) are subject to each scheme; filing deadlines and return formats.
12. **Loans & advances rules** – interest (if any), repayment schedule, maximum deduction
    per period, pausing, what happens on termination.
13. **Other deductions** – court orders/garnishments, private pension, medical insurance,
    union dues, staff purchases.
14. **Net-pay protection** – what happens when deductions exceed earnings.
15. **Off-cycle runs** – bonus-only runs, corrections, voiding/re-issuing a payslip.
16. **Year-end** – annual employee statements, year-end returns, YTD rollover,
    53-pay-week years for weekly/biweekly payrolls.
17. **Rounding & currency** – USD, rounding per line to the cent.
18. **Users & approval** – who else logs in; maker-checker (one person prepares, another approves)
    or single-operator mode.
19. **Payslip delivery** – download only, emailed password-protected PDFs, or an employee
    self-service portal.
20. **Going live mid-year** – import opening YTD earnings/contributions and leave balances.
21. **Departments / cost centres** – for reports and QuickBooks class/location splits.
22. **QuickBooks details** – QBO plan, chart of accounts, classes/locations, journal-entry
    CSV vs direct API connection.
23. **Hosting, backups, retention** – where it runs, backup schedule, how long records are
    kept, BVI Data Protection Act 2021 obligations.
24. **Reminders** – pay dates, statutory filing deadlines, work-permit expiries, probation ends.
25. **Document storage** – contracts, ID copies, medical notes per employee.
26. **Parallel run** – run 1–2 payrolls side-by-side with the current method before switching.

## Sources for statutory defaults
- https://www.globalexpansion.com/countrypedia/british-virgin-islands
- https://www.activpayroll.com/global-insights/british-virgin-islands
- https://www.expanship.com/vg/blog/bvi-payroll-tax
- https://bvi.gov.vg/sites/default/files/resources/Guide%20to%20Payroll%20Tax.pdf
- https://www.bvissb.vg/PDF_files/25Contributions_Legislation.pdf
