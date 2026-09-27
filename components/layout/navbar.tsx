import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Zap } from "lucide-react";

export function Navbar({ userName }: { userName: string }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-dev-cyan shadow-sm">
              <Zap className="h-3 w-3 text-white fill-current" />
            </div>
            DevResolve
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <Link href="/issues" className="hover:text-foreground transition-colors">Issues</Link>
            <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">👤 {userName}</span>
          <ThemeToggle />
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">Sign out</Button>
          </form>
        </div>
      </div>
    </header>
  );
}
