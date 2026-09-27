"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Password field with a show/hide toggle and an optional leading icon (used by the login and register-user pages).
export function PasswordInput({ className, icon, ...props }: Omit<React.ComponentProps<"input">, "type"> & { icon?: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className={cn("relative flex items-center w-full rounded-md border border-input bg-background overflow-hidden", className)}>
      {icon && <div className="w-12 flex flex-shrink-0 items-center justify-center text-zinc-400">{icon}</div>}
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("flex-1 min-w-0 bg-transparent py-2 pr-2 text-base md:text-sm text-dev-slate font-medium outline-none placeholder:text-zinc-400", icon ? "pl-1" : "pl-3")}
      />
      <button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? "Hide password" : "Show password"}
        className="w-10 flex flex-shrink-0 items-center justify-center text-zinc-400 hover:text-dev-slate">
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
