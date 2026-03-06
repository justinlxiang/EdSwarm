import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TokenProvider } from "@/lib/context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ed Swarm - AI Course Intelligence",
  description:
    "AI swarm intelligence for your Ed Discussion courses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <TokenProvider>{children}</TokenProvider>
      </body>
    </html>
  );
}
