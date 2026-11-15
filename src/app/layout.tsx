import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette } from "@/components/command-palette";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TabBar } from "@/components/nav-links";
import "./globals.css";

// Display serif for headlines and big numbers (variable optical sizing + italic).
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

// Body / UI / data: Geist, high legibility with tabular figures.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EIPsInsight, the Ethereum standards observatory",
    template: "%s · EIPsInsight",
  },
  description:
    "Find anything across Ethereum Improvement Proposals, pull requests, contributors and network upgrades, all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <CommandPalette />
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
          <TabBar />
        </ThemeProvider>
      </body>
    </html>
  );
}
