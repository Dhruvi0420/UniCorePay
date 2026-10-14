import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "UniCorePay — Self-Healing Campus Canteen | Mission Control",
  description:
    "An autonomous AI-powered campus canteen ordering system with live SRE health monitoring, circuit breakers, and self-healing payment infrastructure. Built for Identity Hackathon 2026.",
  keywords: [
    "self-healing software",
    "campus canteen",
    "SRE dashboard",
    "circuit breaker",
    "AI agent",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
