"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

/**
 * Login6 from the Monarch Website board. Left column carries the mark and the
 * form; the right holds the photo with the headline set into its top corner.
 *
 * There is no auth behind this yet — any text in both fields signs you in.
 */
export default function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const ready = email.trim().length > 0 && password.trim().length > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (ready) onSignIn();
  }

  return (
    <div className="flex min-h-full flex-1 bg-white">
      {/* Left — brand + form */}
      <div className="flex w-full shrink-0 flex-col justify-center px-8 sm:px-16 lg:w-[720px] lg:px-[120px]">
        <div className="flex items-center gap-[11px]">
          {/*
            -4px is an optical correction, not a layout fudge: "Monarch" has no
            descenders, so its glyphs sit ~3.7px above the centre of the line
            box that flex aligns against. Without it the mark hangs low.
          */}
          <svg
            width="30"
            height="30"
            viewBox="0 0 100 100"
            className="relative -top-1 shrink-0"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.5 0H89.5C95.299 0 100 4.701 100 10.5V89.5C100 95.299 95.299 100 89.5 100H10.5C4.701 100 0 95.299 0 89.5V10.5C0 4.701 4.701 0 10.5 0ZM24 46V79.5C24 80.881 25.119 82 26.5 82H73.5C74.881 82 76 80.881 76 79.5V46C76 31.641 64.359 20 50 20C35.641 20 24 31.641 24 46Z"
              fill="#1F1E1C"
            />
          </svg>
          <span className="font-display text-[29px] leading-[34px] font-medium tracking-[-0.015em] text-[#0A0A0A]">
            Monarch
          </span>
        </div>

        <form
          onSubmit={submit}
          className="flex w-full max-w-[380px] flex-col gap-3 pt-11"
        >
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            className="h-12 shrink-0 rounded-[10px] border border-[#E6E6E6] bg-white px-4 text-[15px] leading-5 text-[#0A0A0A] transition-colors outline-none placeholder:text-[#A0A0A0] focus:border-[#C4C4C4]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            className="h-12 shrink-0 rounded-[10px] border border-[#E6E6E6] bg-white px-4 text-[15px] leading-5 text-[#0A0A0A] transition-colors outline-none placeholder:text-[#A0A0A0] focus:border-[#C4C4C4]"
          />
          <button
            type="submit"
            disabled={!ready}
            className="mt-1 flex h-12 shrink-0 items-center justify-center rounded-[10px] bg-[#141414] text-[15px] leading-5 font-medium text-white transition-colors hover:bg-[#000000] disabled:pointer-events-none disabled:opacity-35"
          >
            Confirm
          </button>
        </form>
      </div>

      {/* Right — photo with the headline set into its top corner */}
      <div className="relative hidden flex-1 items-center justify-center lg:flex">
        <div className="relative h-[754px] max-h-[calc(100dvh-96px)] w-[522px] shrink-0 overflow-hidden rounded-[5px]">
          <Image
            src="/login-hero.png"
            alt=""
            fill
            priority
            sizes="522px"
            className="object-cover"
          />
          <p
            className="absolute left-1/2 top-[calc(42%+30px)] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-display text-[55px] leading-[66px] text-white italic"
            style={{
              textShadow: "0 2px 1.5px rgba(0, 0, 0, 0.2)",
            }}
          >
            You&rsquo;re getting dumber.
          </p>
        </div>
      </div>
    </div>
  );
}
