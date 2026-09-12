"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  buildMonthGrid,
  buildWeekDays,
  eventsForDate,
  formatHourLabel,
  formatTimeCompact,
  isSameDay,
  layoutDayEvents,
  startOfDay,
  type CalendarEvent,
  type CalendarSource,
} from "@/lib/calendar";
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const TIMELINE_START_HOUR = 0;
const TIMELINE_END_HOUR = 24;
const HOUR_HEIGHT = 52;
const WEEK_SCROLL_HOUR = 8;
const GUTTER = 64;
const TIMELINE_PAD_TOP = 12;

const EVENT_PIP: Record<CalendarEvent["kind"], string> = {
  course: "bg-[#8A8A8A]",
  "office-hours": "bg-[#B4B4B0]",
  deadline: "bg-[#1A1A1A]",
  session: "bg-[#6B6B6B]",
};

const WEEK_BLOCK: Record<CalendarEvent["kind"], string> = {
  course: "border-[#D0D0D0] bg-[#F3F3F3] text-[#1A1A1A]",
  "office-hours": "border-[#E0E0E0] bg-white text-[#3D3D3D]",
  deadline: "border-[#1A1A1A] bg-[#1A1A1A] text-white",
  session: "border-[#C8C8C8] bg-[#EDEDED] text-[#1A1A1A]",
};

type CalendarMode = "week" | "month";

function eventLabel(event: CalendarEvent) {
  if (event.kind === "deadline") return event.title;
  if (event.kind === "office-hours") return `${event.code} office hours`;
  return event.code;
}

function eventDetail(event: CalendarEvent) {
  if (event.kind === "deadline") return `${event.code} due`;
  return event.title;
}

function ViewToggle({
  value,
  onChange,
}: {
  value: CalendarMode;
  onChange: (value: CalendarMode) => void;
}) {
  return (
    <div className="flex h-8 items-center rounded-full border border-[#E6E6E6] bg-[#FAFAFA] p-0.5">
      {(["week", "month"] as const).map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`h-7 rounded-full px-3 text-[12px] leading-4 font-medium capitalize transition-colors ${
              active
                ? "bg-white text-[#0A0A0A] shadow-sm"
                : "text-[#7A7A7A] hover:text-[#3D3D3D]"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function MonthView({
  year,
  month,
  today,
  source,
}: {
  year: number;
  month: number;
  today: Date;
  source: CalendarSource;
}) {
  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[#EAEAEA]">
      <div className="grid shrink-0 grid-cols-7 border-b border-[#EAEAEA]">
        {WEEKDAYS.map((day) => (
          <div key={day} className="flex h-9 items-center justify-center">
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.06em] text-[#8A8A8A]">
              {day}
            </span>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-6">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid min-h-0 grid-cols-7">
            {week.map(({ date, inMonth }) => {
              const events = eventsForDate(date, source);
              const isToday = isSameDay(date, today);
              const visible = events.slice(0, 3);
              const extra = events.length - visible.length;

              return (
                <div
                  key={date.toISOString()}
                  className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-b border-[#EAEAEA] px-1.5 pt-1.5 pb-1 last:border-r-0"
                >
                  <div className="mb-1 flex justify-center">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] leading-4 ${
                        isToday
                          ? "bg-[#1A1A1A] font-medium text-white"
                          : inMonth
                            ? "text-[#1A1A1A]"
                            : "text-[#C4C4C4]"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="flex min-h-0 flex-col gap-0.5">
                    {visible.map((event) =>
                      event.kind === "deadline" ? (
                        <span
                          key={event.id}
                          className="truncate rounded-[4px] bg-[#1A1A1A] px-1.5 py-[2px] text-[11px] leading-[15px] text-white"
                        >
                          {event.title}
                        </span>
                      ) : (
                        <span
                          key={event.id}
                          className="flex min-w-0 items-center gap-1 px-0.5 text-[11px] leading-[15px] text-[#3D3D3D]"
                        >
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${EVENT_PIP[event.kind]}`}
                          />
                          <span className="shrink-0 text-[#8A8A8A]">
                            {formatTimeCompact(event.startMin)}
                          </span>
                          <span className="min-w-0 truncate">{eventLabel(event)}</span>
                        </span>
                      ),
                    )}
                    {extra > 0 ? (
                      <span className="px-0.5 text-[11px] leading-[15px] text-[#8A8A8A]">
                        {extra} more
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({
  anchor,
  today,
  source,
}: {
  anchor: Date;
  today: Date;
  source: CalendarSource;
}) {
  const days = useMemo(() => buildWeekDays(anchor), [anchor]);
  const hours = useMemo(
    () =>
      Array.from(
        { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
        (_, i) => TIMELINE_START_HOUR + i,
      ),
    [],
  );
  const gridHeight =
    (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT + TIMELINE_PAD_TOP;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowMin(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const pane = scrollRef.current;
    if (!pane) return;
    pane.scrollTop =
      TIMELINE_PAD_TOP +
      (WEEK_SCROLL_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT;
  }, [anchor]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[#EAEAEA]">
      <div
        className="grid shrink-0 border-b border-[#EAEAEA]"
        style={{ gridTemplateColumns: `${GUTTER}px repeat(7, minmax(0, 1fr))` }}
      >
        <div />
        {days.map((date) => {
          const isToday = isSameDay(date, today);
          return (
            <div
              key={date.toISOString()}
              className="flex flex-col items-center gap-1 py-2"
            >
              <span
                className={`text-[11px] leading-[14px] font-medium tracking-[0.06em] ${
                  isToday ? "text-[#1A1A1A]" : "text-[#8A8A8A]"
                }`}
              >
                {WEEKDAYS[date.getDay()]}
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] leading-5 ${
                  isToday
                    ? "bg-[#1A1A1A] font-medium text-white"
                    : "text-[#1A1A1A]"
                }`}
              >
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${GUTTER}px repeat(7, minmax(0, 1fr))`,
            height: gridHeight,
          }}
        >
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2"
                style={{
                  top:
                    TIMELINE_PAD_TOP +
                    (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT,
                }}
              >
                {hour < TIMELINE_END_HOUR ? (
                  <span className="text-[11px] leading-[14px] text-[#8A8A8A]">
                    {formatHourLabel(hour)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          {days.map((date) => {
            const isToday = isSameDay(date, today);
            const events = layoutDayEvents(eventsForDate(date, source));
            const showNow =
              isToday &&
              nowMin != null &&
              nowMin >= TIMELINE_START_HOUR * 60 &&
              nowMin <= TIMELINE_END_HOUR * 60;
            const nowTop =
              nowMin != null
                ? TIMELINE_PAD_TOP +
                  ((nowMin - TIMELINE_START_HOUR * 60) / 60) * HOUR_HEIGHT
                : 0;

            return (
              <div
                key={date.toISOString()}
                className="relative overflow-hidden border-l border-[#EAEAEA]"
              >
                {hours.map((hour) =>
                  hour < TIMELINE_END_HOUR ? (
                    <div
                      key={hour}
                      className="absolute right-0 left-0 border-t border-[#EFEFEF]"
                      style={{
                        top:
                          TIMELINE_PAD_TOP +
                          (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT,
                        height: HOUR_HEIGHT,
                      }}
                    />
                  ) : null,
                )}

                {events.map((event) => {
                  const top =
                    TIMELINE_PAD_TOP +
                    ((event.startMin - TIMELINE_START_HOUR * 60) / 60) *
                      HOUR_HEIGHT;
                  const height = Math.max(
                    ((event.displayEndMin - event.startMin) / 60) * HOUR_HEIGHT,
                    22,
                  );
                  const width = 100 / event.cols;
                  const left = event.col * width;
                  const showTime = height >= 36;

                  return (
                    <div
                      key={event.id}
                      className={`absolute overflow-hidden rounded-md border px-1.5 py-1 ${WEEK_BLOCK[event.kind]}`}
                      style={{
                        top: Math.max(top, 0),
                        height,
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                      }}
                    >
                      <p className="truncate text-[11px] leading-[14px] font-medium">
                        {eventLabel(event)}
                      </p>
                      {showTime ? (
                        <p className="truncate text-[10px] leading-[13px] opacity-70">
                          {event.kind === "deadline"
                            ? eventDetail(event)
                            : `${formatTimeCompact(event.startMin)} – ${formatTimeCompact(event.displayEndMin)}`}
                        </p>
                      ) : null}
                    </div>
                  );
                })}

                {showNow ? (
                  <div
                    className="pointer-events-none absolute right-0 left-0 z-10"
                    style={{ top: nowTop }}
                  >
                    <div className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-[#D93025]" />
                    <div className="h-px bg-[#D93025]" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CalendarClient({ source }: { source: CalendarSource }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [anchor, setAnchor] = useState(today);

  const headerLabel = useMemo(() => {
    if (mode === "month") {
      return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }
    const days = buildWeekDays(anchor);
    const first = days[0];
    const last = days[6];
    if (!first || !last) return "";
    if (first.getMonth() === last.getMonth()) {
      return `${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
    }
    if (first.getFullYear() === last.getFullYear()) {
      return `${MONTHS[first.getMonth()]} – ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
    }
    return `${MONTHS[first.getMonth()]} ${first.getFullYear()} – ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
  }, [anchor, mode]);

  const step = (delta: number) => {
    if (mode === "month") {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1));
      return;
    }
    setAnchor(
      new Date(
        anchor.getFullYear(),
        anchor.getMonth(),
        anchor.getDate() + delta * 7,
      ),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex h-14 shrink-0 items-center justify-between px-6">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={mode === "month" ? "Previous month" : "Previous week"}
            className="flex h-8 w-8 items-center justify-center text-[#3D3D3D] transition-colors hover:text-[#0A0A0A]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24">
              <path
                d="M14.5 6l-6 6 6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="px-0.5 text-center text-sm leading-5 font-medium text-[#1A1A1A]">
            {headerLabel}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={mode === "month" ? "Next month" : "Next week"}
            className="flex h-8 w-8 items-center justify-center text-[#3D3D3D] transition-colors hover:text-[#0A0A0A]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24">
              <path
                d="M9.5 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <ViewToggle value={mode} onChange={setMode} />
      </div>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence initial={false}>
          <motion.div
            key={mode}
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {mode === "month" ? (
              <MonthView
                year={anchor.getFullYear()}
                month={anchor.getMonth()}
                today={today}
                source={source}
              />
            ) : (
              <WeekView anchor={anchor} today={today} source={source} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
