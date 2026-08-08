import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import Rail from "@/components/rail";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumis",
  description: "The AI platform for higher ed.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full min-h-full bg-white text-[#0A0A0A]">
        <Rail />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
