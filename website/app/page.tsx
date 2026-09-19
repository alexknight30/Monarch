import { Hero } from "@/components/hero";
import { PinnedWordmark } from "@/components/pinned-wordmark";

export default function Home() {
  return (
    <>
      <PinnedWordmark />
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
        }}
      >
        <div id="site-hero">
          <Hero />
        </div>
        {/* Later sections are retained in components/page-two.tsx and
            components/page-three.tsx until the full site is ready to launch. */}
      </main>
    </>
  );
}
