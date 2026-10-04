import { CompanySwitcher } from "@/components/company-switcher";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { SignOutButton } from "@/components/sign-out-button";
import { can } from "@/lib/permissions";
import { getCompanyContext } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, memberships, active } = await getCompanyContext();
  const role = active?.role;

  const items: NavItem[] = [];
  if (active) {
    items.push({ href: "/", label: "Dashboard" });
    if (can(role, "company.view")) items.push({ href: "/settings/company", label: "Company settings" });
    if (can(role, "users.manage")) items.push({ href: "/settings/users", label: "Users & roles" });
    if (can(role, "audit.view")) items.push({ href: "/audit", label: "Audit log" });
  }
  if (user.isSystemAdmin) items.push({ href: "/companies", label: "All companies" });
  items.push({ href: "/account", label: "My account" });

  const nav = (
    <>
      <NavLinks items={items} />
      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="truncate px-3 text-xs text-slate-500">{user.email}</p>
        <SignOutButton />
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
        <p className="mb-4 px-3 text-lg font-semibold">Payroll</p>
        {nav}
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-2 py-1 text-sm" aria-label="Menu">
              ☰
            </summary>
            <nav className="absolute left-0 top-10 w-64 rounded-md border border-slate-200 bg-white p-3 shadow-lg">{nav}</nav>
          </details>
          {memberships.length > 0 && <span className="hidden text-sm text-slate-500 sm:inline">Company</span>}
          <CompanySwitcher memberships={memberships} activeId={active?.companyId ?? null} />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
