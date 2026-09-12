import type { Metadata } from "next";
import { Newsreader, Inter, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "Monarch",
  description: "AI that works with you, not for you.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${newsreader.variable} ${inter.variable} ${sourceSans.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
