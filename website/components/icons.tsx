/** Lucide-style stroke icons, matching the set used in the Monarch app. */

type IconProps = { size?: number; color?: string };

function Svg({
  size = 20,
  color = "#0A0A0A",
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconAttach = (p: IconProps) => (
  <Svg {...p}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </Svg>
);

export const IconMic = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <path d="M12 19v3" />
  </Svg>
);

export const IconSend = () => (
  <Svg size={18} color="#FFFFFF">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Svg>
);

export const IconGuide = () => (
  <Svg size={14} color="#4A4A4A">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </Svg>
);

export const IconSummarize = () => (
  <Svg size={14} color="#4A4A4A">
    <path d="M4 6h16" />
    <path d="M4 12h10" />
    <path d="M4 18h14" />
  </Svg>
);

export const IconQuiz = () => (
  <Svg size={14} color="#4A4A4A">
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2Z" />
  </Svg>
);

export const IconClock = () => (
  <Svg size={14} color="#4A4A4A">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconUpload = () => (
  <Svg size={14} color="#4A4A4A">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M12 4v12" />
  </Svg>
);

/** Placeholder rail glyphs — one per nav slot. */
export function RailIcon({
  index,
  active = false,
}: {
  index: number;
  active?: boolean;
}) {
  const glyphs = [
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>,
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m7 14 3-3 2 2 5-5" />
    </>,
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7 9h10M7 13h7" />
    </>,
    <>
      <path d="M3 12h5l2 3h4l2-3h5" />
      <path d="M4 6h16v12H4z" />
    </>,
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
    <>
      <path d="M4 5h6l2 4-3 2a12 12 0 0 0 5 5l2-3 4 2v5a15 15 0 0 1-16-15Z" />
    </>,
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </>,
  ];

  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "#F2F2F2" : "transparent",
      }}
    >
      <Svg size={17} color="#5A5A5A">
        {glyphs[index % glyphs.length]}
      </Svg>
    </div>
  );
}
