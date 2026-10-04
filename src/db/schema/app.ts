import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const companyRole = pgEnum("company_role", ["owner", "approver", "processor", "viewer"]);

// BVI Payroll Tax: Class 1 (small employer, 2% employer share) or Class 2 (6% employer share).
export const payrollTaxClass = pgEnum("payroll_tax_class", ["class1", "class2"]);

export const company = pgTable("company", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  country: text("country").notNull().default("British Virgin Islands"),
  phone: text("phone"),
  email: text("email"),
  socialSecurityEmployerNo: text("social_security_employer_no"),
  nhiEmployerNo: text("nhi_employer_no"),
  payrollTaxNo: text("payroll_tax_no"),
  payrollTaxClass: payrollTaxClass("payroll_tax_class").notNull().default("class2"),
  currency: text("currency").notNull().default("USD"),
  // 1 = January. Used for YTD and leave-year boundaries.
  fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
  timezone: text("timezone").notNull().default("America/Tortola"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const companyMembership = pgTable(
  "company_membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: companyRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("company_membership_company_user_uq").on(t.companyId, t.userId),
    index("company_membership_user_idx").on(t.userId),
  ],
);

// Append-only: a database trigger (see migration) rejects UPDATE and DELETE.
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    // Null for system-wide events (logins, user accounts).
    companyId: uuid("company_id").references(() => company.id, { onDelete: "restrict" }),
    userId: text("user_id").references(() => user.id, { onDelete: "restrict" }),
    // Copied at write time so the record stays readable on its own.
    userEmail: text("user_email"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    reason: text("reason"),
    ipAddress: text("ip_address"),
  },
  (t) => [
    index("audit_log_company_time_idx").on(t.companyId, t.occurredAt.desc()),
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
  ],
);
