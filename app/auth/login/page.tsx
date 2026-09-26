import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { signIn } from "@/app/auth/actions";
import { Sparkles, Terminal } from "lucide-react";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error
    ? decodeURIComponent(params.error)
    : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dev-cyan opacity-20 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-dev-slate opacity-20 blur-[100px]" />
        <div className="absolute top-3/4 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dev-mint opacity-15 blur-[80px]" />
      </div>

      <div className="absolute right-6 top-6 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[400px] space-y-8">
        {/* Brand */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-dev-cyan to-dev-slate shadow-lg">
            <Terminal className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              DevResolve
            </h1>
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-dev-terracotta" />
              AI-Powered Issue Resolution
            </p>
          </div>
        </div>

        <Card className="border-muted/50 bg-background/60 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl font-semibold">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to access the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="namaUser" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Username
                </Label>
                <Input
                  id="namaUser"
                  name="namaUser"
                  type="text"
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  className="h-11 bg-background/50 focus-visible:ring-dev-cyan"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sandiUser" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                </div>
                <PasswordInput
                  id="sandiUser"
                  name="sandiUser"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-11 bg-background/50 focus-visible:ring-dev-cyan"
                />
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <Button type="submit" className="h-11 w-full bg-dev-cyan text-white transition-colors hover:bg-dev-slate">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs font-medium text-muted-foreground/60">
          IBM Bob 2.0 Hackathon — DevResolve Team
        </p>
      </div>
    </main>
  );
}
