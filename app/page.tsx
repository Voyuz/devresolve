import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-3xl font-semibold">DevResolve AI</h1>
      <p className="text-muted-foreground">Project foundation for the IBM Bob 2.0 Hackathon.</p>
      <nav aria-label="Project routes" className="flex flex-wrap gap-4">
        <Link href="/dashboard" className="underline">Dashboard</Link>
        <Link href="/issues" className="underline">Issues</Link>
        <Link href="/issues/new" className="underline">New issue</Link>
        <Link href="/projects" className="underline">Projects</Link>
      </nav>
      <ThemeToggle />
    </main>
  );
}
