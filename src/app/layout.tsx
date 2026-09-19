import type { Metadata } from "next";
import { Inter, Neuton, Newsreader, Work_Sans } from "next/font/google";
import Rail from "@/components/rail";
import { ViewProvider } from "@/components/view-provider";
import { getServerViewId } from "@/lib/views-server";
import { readViewStore } from "@/lib/local-db";
import "katex/dist/katex.min.css";
import "./globals.css";
import { DesignRuntime } from "@/components/design/runtime";
import DesignEditor from "@/components/design/editor";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const neuton = Neuton({
  variable: "--font-neuton",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
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
  const { profile } = await readViewStore(viewId);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${neuton.variable} ${workSans.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full min-h-full bg-[#F5F3EE] text-[#0A0A0A]">
        <DesignRuntime>
          <ViewProvider viewId={viewId} profile={profile}>
            <Rail />
            <div data-design-id="m-3089d5f35b3a" className="flex min-h-0 min-w-0 flex-1 flex-col pt-2">
              <main data-design-id="m-a5daf3330150" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-tl-[24px] border-t border-l border-[#E3E0D9] bg-white">
                {children}
              </main>
            </div>
          </ViewProvider>
          {process.env.NODE_ENV === "development" && <DesignEditor />}
        </DesignRuntime>
      </body>
    </html>
  );
}
