/** Monarch logo + wordmark lockup, 152×34. `light` is for use over imagery. */
export function Wordmark({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light" | "inherit";
  className?: string;
}) {
  const color =
    tone === "inherit" ? "inherit" : tone === "light" ? "#FFFFFF" : "#0a0a0a";

  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap: 11, color }}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 100 100"
        style={{ flexShrink: 0, position: "relative", top: -4 }}
        aria-hidden
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.5 0H89.5C95.299 0 100 4.701 100 10.5V89.5C100 95.299 95.299 100 89.5 100H10.5C4.701 100 0 95.299 0 89.5V10.5C0 4.701 4.701 0 10.5 0ZM24 46V79.5C24 80.881 25.119 82 26.5 82H73.5C74.881 82 76 80.881 76 79.5V46C76 31.641 64.359 20 50 20C35.641 20 24 31.641 24 46Z"
          fill="currentColor"
        />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 29,
          fontWeight: 500,
          letterSpacing: "-0.015em",
          lineHeight: "34px",
          color: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        Monarch
      </span>
    </div>
  );
}
