"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <div role="group" aria-label="Color theme" className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setTheme("light")}><Sun /> Light</Button>
      <Button variant="outline" size="sm" onClick={() => setTheme("dark")}><Moon /> Dark</Button>
      <Button variant="outline" size="sm" onClick={() => setTheme("system")}><Monitor /> System</Button>
    </div>
  );
}
