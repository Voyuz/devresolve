import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="antialiased bg-[#fcfcfd]">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>{children}</ThemeProvider>
      </body>
    </html>
  );
}