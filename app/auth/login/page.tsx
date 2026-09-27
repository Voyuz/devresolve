import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { signIn } from "@/app/auth/actions";
import { Zap, User, Lock } from "lucide-react";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error
    ? decodeURIComponent(params.error)
    : null;

  return (
    <main className="relative flex min-h-screen w-full bg-white overflow-hidden">
      {/* Right side background */}
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-b from-dev-slate to-dev-cyan z-0" />

      {/* SVG Splitter S-Curve */}
      <svg 
        className="absolute left-1/2 top-0 h-full w-[30vw] min-w-[300px] -translate-x-1/2 z-10 pointer-events-none" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wave-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6287a2" />
            <stop offset="100%" stopColor="#5ec0ca" />
          </linearGradient>
        </defs>
        {/* White part (left side of the wave) */}
        <path d="M0,0 L50,0 C10,35 90,65 50,100 L0,100 Z" className="text-white fill-current" />
        {/* Dark part (right side of the wave) */}
        <path d="M100,0 L50,0 C10,35 90,65 50,100 L100,100 Z" fill="url(#wave-gradient)" />
      </svg>

      {/* Content Container */}
      <div className="relative z-20 flex w-full min-h-screen">
        
        {/* Left Side: Brand */}
        <div className="hidden lg:flex w-1/2 flex-col items-center justify-center p-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-dev-cyan shadow-2xl shadow-dev-cyan/20">
              <Zap className="h-10 w-10 text-white fill-current" />
            </div>
            <div className="text-center">
              <h1 className="text-5xl font-black tracking-tight text-dev-slate">
                DevResolve
              </h1>
              <p className="mt-2 text-base font-medium text-zinc-400">
                AI-Powered Issue Resolution
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-[400px] space-y-8">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                Sign in to your account
              </h2>
              <p className="text-sm font-medium text-white/80">
                Manage your workspace and issues with precision
              </p>
            </div>

            <form action={signIn} className="space-y-6">
              {/* Page the visitor was sent here from; signIn only accepts same-site paths. */}
              {params.next && <input type="hidden" name="next" value={params.next} />}
              <div className="space-y-2">
                <Label htmlFor="namaUser" className="text-xs font-bold text-white drop-shadow-sm">
                  Username
                </Label>
                <div className="relative flex items-center w-full rounded-full border border-white/40 bg-white focus-within:ring-4 focus-within:ring-white/30 transition-all shadow-lg overflow-hidden">
                  <div className="w-12 flex flex-shrink-0 items-center justify-center text-zinc-400 bg-white">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="namaUser"
                    name="namaUser"
                    type="text"
                    placeholder="username"
                    required
                    autoComplete="username"
                    className="flex-1 min-w-0 bg-transparent py-2 pl-1 pr-3 text-base md:text-sm text-dev-slate font-medium outline-none placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sandiUser" className="text-xs font-bold text-white drop-shadow-sm">
                  Password
                </Label>
                <PasswordInput
                  id="sandiUser"
                  name="sandiUser"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  icon={<Lock className="w-4 h-4" />}
                  className="rounded-full border-white/40 bg-white text-dev-slate font-medium focus-within:ring-4 focus-within:ring-white/30 transition-all shadow-lg"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-white font-medium backdrop-blur-md">
                  {errorMessage}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full rounded-full bg-dev-sand text-dev-slate hover:bg-white hover:text-dev-cyan transition-colors h-12 text-sm font-bold shadow-xl mt-4"
              >
                Sign In
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
