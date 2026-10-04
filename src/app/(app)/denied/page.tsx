import Link from "next/link";
import { Card } from "@/components/ui";

export default function DeniedPage() {
  return (
    <Card>
      <h1 className="text-lg font-semibold">You don&apos;t have access to that page</h1>
      <p className="mt-1 text-sm text-slate-600">Your role in this company doesn&apos;t allow it. Ask the company owner if you need access.</p>
      <Link href="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
        Back to dashboard
      </Link>
    </Card>
  );
}
