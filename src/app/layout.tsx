import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import LoginGate from "@/components/login-gate";
import Rail from "@/components/rail";
import { ViewProvider } from "@/components/view-provider";
import { getServerViewId } from "@/lib/views-server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Monarch",
  description: "The AI platform for higher ed.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewId = await getServerViewId();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full min-h-full bg-white text-[#0A0A0A]">
        <ViewProvider viewId={viewId}>
          <LoginGate>
            <Rail />
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {children}
            </main>
          </LoginGate>
        </ViewProvider>
      </body>
    </html>
  );
}
