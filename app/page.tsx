import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-3xl font-semibold">DevResolve AI</h1>
      <p className="text-muted-foreground">Bug reporting, Bob investigation, and developer review.</p>
      <nav aria-label="Project routes" className="flex flex-wrap gap-4">
        <Link href="/dashboard" className="underline">Dashboard</Link>
        <Link href="/issues" className="underline">Issues</Link>
        <Link href="/issues/new" className="underline">New issue</Link>
        <Link href="/projects" className="underline">Projects</Link>
        <Link href="/developer" className="underline">Developer workspace</Link>
        <Link href="/bob-test" className="underline font-semibold">Bob Integration Test</Link>
      </nav>
      <ThemeToggle />
    </main>
  );
}
