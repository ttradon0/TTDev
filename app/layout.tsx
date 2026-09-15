import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Common Room · TTDev",
    template: "%s · Common Room",
  },
  description: "Find a welcoming university meeting room and book your next study session.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={GeistSans.variable + " " + GeistMono.variable + " h-full antialiased"}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
