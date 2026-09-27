"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  // The sign-in and register pages have their own light-only design (wave + gradient); dark mode would
  // turn their white surfaces dark while the white SVG wave stays white. Keep them light on every device.
  const pathname = usePathname();
  return <NextThemesProvider {...props} forcedTheme={pathname?.startsWith("/auth") ? "light" : props.forcedTheme} />;
}
