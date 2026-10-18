import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

// Self-hosted at build time by Next, so no request to Google from the phone.
const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-display-face" });
const sans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans-face" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono-face" });

export const metadata: Metadata = {
  title: "Snapfit",
  description: "Snap your scale, meals and workouts. Snapfit logs them and coaches you.",
  appleWebApp: { capable: true, title: "Snapfit", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png", icon: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1613" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <RegisterSW />
        <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-4 pb-12">{children}</main>
      </body>
    </html>
  );
}
