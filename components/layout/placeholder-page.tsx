import Link from "next/link";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">Development placeholder.</p>
      <Link href="/dashboard" className="underline underline-offset-4">Back to Dashboard</Link>
    </main>
  );
}
