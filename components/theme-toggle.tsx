"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

// The stored theme is only known in the browser; render no selection on the server to avoid a hydration mismatch.
const subscribe = () => () => {};
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <div role="group" aria-label="Color theme" className="flex gap-2">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <Button
            key={value}
            variant="outline"
            size="sm"
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={active ? "border-[#5ec0ca] text-[#449199] bg-[#5ec0ca]/10" : undefined}
          >
            <Icon /> {label}
          </Button>
        );
      })}
    </div>
  );
}
