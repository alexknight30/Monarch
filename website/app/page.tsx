import { Scaled } from "@/components/scaled";
import { Hero } from "@/components/hero";
import { PageTwo } from "@/components/page-two";
import { PageThree } from "@/components/page-three";
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
        <Scaled height={900}>
          <PageTwo />
        </Scaled>
        <Scaled height={1328}>
          <PageThree />
        </Scaled>
      </main>
    </>
  );
}
