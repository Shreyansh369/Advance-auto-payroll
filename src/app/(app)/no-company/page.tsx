import { Card } from "@/components/ui";

export default function NoCompanyPage() {
  return (
    <Card>
      <h1 className="text-lg font-semibold">No company access yet</h1>
      <p className="mt-1 text-sm text-slate-600">Your account works, but you haven&apos;t been added to a company. Ask the administrator to give you access.</p>
    </Card>
  );
}
