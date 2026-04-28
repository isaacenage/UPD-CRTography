import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SwRegister from "@/components/SwRegister";
import NoZoomGate from "@/components/NoZoomGate";
import { ThemeProvider, NO_FOUC_SCRIPT } from "@/lib/theme/context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hanap-Bidet: UPD Edition",
  description:
    "A guide to comfort room locations across UP Diliman — bidet availability, gender access, and walking directions for students, staff, joggers, and visitors.",
  applicationName: "Hanap-Bidet",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hanap-Bidet",
    startupImage: ["/icons/logo.svg"],
  },
  icons: {
    icon: [{ url: "/icons/logo.svg", type: "image/svg+xml", sizes: "any" }],
    shortcut: [{ url: "/icons/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/logo.svg", type: "image/svg+xml", sizes: "any" }],
    other: [
      { rel: "mask-icon", url: "/icons/logo.svg", color: "#7B1113" },
    ],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#7B1113",
  width: "device-width",
  initialScale: 1,
  // viewportFit: "cover" is the load-bearing line — without it,
  // env(safe-area-inset-*) silently returns 0 on iPhone.
  viewportFit: "cover",
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets `.dark` on <html> before paint so a dark-preferred reload
            never flashes the light surface. Must run before React hydrates;
            inlined as a tiny IIFE for that reason. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FOUC_SCRIPT }} />
      </head>
      <body className="bg-paper text-ink antialiased min-h-[100svh] overscroll-none">
        <ThemeProvider>
          <NoZoomGate />
          {children}
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
