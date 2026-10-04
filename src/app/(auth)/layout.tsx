export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-semibold text-slate-900">Payroll</p>
          <p className="text-sm text-slate-500">Private payroll system</p>
        </div>
        {children}
      </div>
    </main>
  );
}
