"use client";

import { motion } from "motion/react";

type ShiningTextProps = {
  text: string;
  className?: string;
};

export function ShiningText({ text, className }: ShiningTextProps) {
  return (
    <motion.span data-design-id="m-ca79215b0982"
      className={`bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-[15px] leading-[25px] font-normal text-transparent ${className ?? ""}`}
      initial={{ backgroundPosition: "200% 0" }}
      animate={{ backgroundPosition: "-200% 0" }}
      transition={{
        repeat: Infinity,
        duration: 2,
        ease: "linear",
      }}
    >
      {text}
    </motion.span>
  );
}
