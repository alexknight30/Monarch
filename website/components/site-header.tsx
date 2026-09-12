import { Wordmark } from "./wordmark";
import { Scaled } from "./scaled";

/** Slim enough to clear the artboards' content, which starts at y=132. */
const HEADER_HEIGHT = 62;
const WORDMARK_TOP = 16;
const WORDMARK_LEFT = 40;

/** Fixed brand bar — one instance for the whole site, scaled with the page. */
export function SiteHeader() {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "#ffffff",
      }}
    >
      <Scaled height={HEADER_HEIGHT}>
        <div style={{ position: "absolute", left: WORDMARK_LEFT, top: WORDMARK_TOP }}>
          <Wordmark />
        </div>
      </Scaled>
    </header>
  );
}
