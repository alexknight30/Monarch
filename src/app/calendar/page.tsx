"use client";

import { useMemo, useState } from "react";
import {
  buildMonthGrid,
  eventsForDate,
  formatDuration,
  formatTime,
  isSameDay,
  loggedMinutesForDate,
  loggedMinutesForMonth,
  type CalendarEvent,
  type CalendarSource,
} from "@/lib/calendar";
import { useViewDataset } from "@/components/view-provider";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Day-panel timeline. Runs to 23:00 rather than the mockup's 22:00 so that
 * 11:59pm assignment deadlines actually land on the track.
 */
const TIMELINE_START_HOUR = 8;
const TIMELINE_END_HOUR = 23;
const HOUR_HEIGHT = 31;

const CHIP_STYLES: Record<CalendarEvent["kind"], string> = {
  class: "bg-[#F0F0F0] text-[#3D3D3D]",
  "office-hours": "bg-white text-[#6B6B6B] border border-[#E6E6E6]",
  deadline: "bg-[#1A1A1A] text-white",
  session: "bg-[#EDEDED] text-[#3D3D3D]",
};

const BLOCK_STYLES: Record<CalendarEvent["kind"], string> = {
  class: "border-l-2 border-[#C4C4C4] bg-[#FAFAFA] text-[#6B6B6B]",
  "office-hours": "border-l-2 border-[#C4C4C4] bg-[#FAFAFA] text-[#6B6B6B]",
  deadline: "border-l-2 border-[#1A1A1A] bg-[#F1F1F1] text-[#0A0A0A]",
  session: "border-l-2 border-[#0A0A0A] bg-[#F1F1F1] text-[#0A0A0A]",
};

function DayPanel({
  date,
  onClose,
  source,
}: {
  date: Date;
  onClose: () => void;
  source: CalendarSource;
}) {
  const events = eventsForDate(date, source);
  const logged = loggedMinutesForDate(date, source);
  const hours = Array.from(
    { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
    (_, i) => TIMELINE_START_HOUR + i,
  );

  return (
    <div className="flex w-[434px] shrink-0 flex-col gap-3.5 border-l border-[#EAEAEA] bg-white p-5">
      {/* Panel head */}
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-lg leading-6 font-medium tracking-[-0.01em] text-[#0A0A0A]">
            {logged ? formatDuration(logged) : "0m"}
          </span>
          <span className="text-[13px] leading-[18px] text-[#6B6B6B]">
            logged {date.toLocaleDateString("en-US", { weekday: "long" })}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[#F5F5F5]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="#6B6B6B"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Date */}
      <div className="flex h-10 shrink-0 items-center justify-center rounded-lg border border-[#E6E6E6]">
        <span className="text-sm leading-5 font-medium text-[#1A1A1A]">
          {MONTHS[date.getMonth()].slice(0, 3)} {date.getDate()}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#EAEAEA] py-2.5 pr-2.5">
        <div className="flex w-[52px] shrink-0 flex-col items-end pr-2">
          {hours.map((h) => (
            <div key={h} className="flex w-full shrink-0 justify-end" style={{ height: HOUR_HEIGHT }}>
              <span className="text-[11px] leading-[11px] text-[#6B6B6B]">
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        <div className="relative flex-1">
          {hours.map((h) => (
            <div key={h} className="w-full shrink-0 border-t border-[#F0F0F0]" style={{ height: HOUR_HEIGHT }} />
          ))}

          {events.map((event) => {
            const offset =
              ((event.startMin - TIMELINE_START_HOUR * 60) / 60) * HOUR_HEIGHT;
            const height = Math.max(
              ((event.endMin - event.startMin) / 60) * HOUR_HEIGHT,
              22,
            );
            return (
              <div
                key={event.id}
                className={`absolute left-0 w-full overflow-hidden rounded-r-md px-2.5 py-1.5 ${BLOCK_STYLES[event.kind]}`}
                style={{ top: Math.max(offset, 0), height }}
              >
                <p className="truncate text-xs leading-[17px] font-medium">
                  {event.kind === "deadline"
                    ? `${event.code} · ${event.title} due`
                    : `${event.code} · ${event.title}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add-session form */}
      <div className="flex h-11 shrink-0 items-center gap-3 rounded-lg border border-[#E6E6E6] px-3">
        <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="13" r="8" fill="none" stroke="#6B6B6B" strokeWidth="1.7" />
          <path d="M12 9v4l2.5 1.5M9.5 2.5h5" fill="none" stroke="#6B6B6B" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="text-sm leading-5 text-[#1A1A1A]">1:00 PM</span>
        <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
          <path d="M4 12h15M14 7l5 5-5 5" fill="none" stroke="#A0A0A0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="flex-1 text-sm leading-5 text-[#1A1A1A]">3:45 PM</span>
        <span className="text-[13px] leading-[18px] text-[#6B6B6B]">2h 45min</span>
      </div>

      <div className="flex h-11 shrink-0 items-center gap-2.5 rounded-lg border border-[#E6E6E6] px-3">
        <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
          <circle cx="11" cy="11" r="7" fill="none" stroke="#6B6B6B" strokeWidth="1.8" />
          <path d="M16.5 16.5L21 21" fill="none" stroke="#6B6B6B" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="text-sm leading-5 text-[#A0A0A0]">What are you working on?</span>
      </div>

      <div className="flex h-11 shrink-0 items-center justify-between gap-2.5 rounded-lg border border-[#E6E6E6] px-3">
        <div className="flex items-center gap-2.5">
          <span className="h-[18px] w-[18px] shrink-0 rounded-full bg-[#0A0A0A]" />
          <span className="text-sm leading-5 text-[#1A1A1A]">Study session</span>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
          <path d="M6 9.5l6 6 6-6" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <button
        type="button"
        className="flex h-11 shrink-0 items-center justify-center rounded-lg bg-[#141414] text-sm leading-5 font-medium text-white transition-colors hover:bg-[#2A2A2A]"
      >
        Add session
      </button>
    </div>
  );
}

export default function CalendarPage() {
  const source = useViewDataset();
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Date | null>(null);

  const weeks = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const stepMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setSelected(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-white">
      {/* Calendar column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between px-6">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] leading-[18px] font-medium text-[#0A0A0A]">
              {formatDuration(loggedMinutesForMonth(source))}
            </span>
            <span className="text-[13px] leading-[18px] text-[#6B6B6B]">
              studied in {MONTHS[viewMonth]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepMonth(-1)}
              aria-label="Previous month"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-[#E6E6E6] transition-colors hover:bg-[#FAFAFA]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24">
                <path d="M14.5 6l-6 6 6 6" fill="none" stroke="#3D3D3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="w-[104px] text-center text-sm leading-5 font-medium text-[#1A1A1A]">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => stepMonth(1)}
              aria-label="Next month"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-[#E6E6E6] transition-colors hover:bg-[#FAFAFA]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24">
                <path d="M9.5 6l6 6-6 6" fill="none" stroke="#3D3D3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Month grid */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-l border-[#EAEAEA]">
          <div className="flex h-[34px] shrink-0">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="flex flex-1 items-center border-r border-b border-[#EAEAEA] pl-3"
              >
                <span className="text-[11px] leading-[14px] font-medium tracking-[0.06em] text-[#8A8A8A]">
                  {day}
                </span>
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="flex min-h-0 flex-1">
              {week.map(({ date, inMonth }) => {
                const events = eventsForDate(date, source);
                const isToday = isSameDay(date, today);
                const isSelected = selected ? isSameDay(date, selected) : false;

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => setSelected(date)}
                    className={`flex min-w-0 flex-1 flex-col items-stretch gap-[7px] overflow-hidden px-3 py-[9px] text-left transition-colors ${
                      isSelected
                        ? "border border-[#0A0A0A]"
                        : "border-r border-b border-[#EAEAEA]"
                    } ${
                      !inMonth
                        ? "bg-[#FAFAFA]"
                        : isToday
                          ? "bg-[#F5F5F5]"
                          : "hover:bg-[#FCFCFC]"
                    }`}
                  >
                    <span
                      className={`shrink-0 text-sm leading-5 ${
                        !inMonth
                          ? "text-[#C4C4C4]"
                          : isSelected
                            ? "font-medium text-[#0A0A0A]"
                            : "text-[#1A1A1A]"
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {inMonth &&
                      events.slice(0, 2).map((event) => (
                        <span
                          key={event.id}
                          className={`shrink-0 truncate rounded-[5px] px-2 py-[3px] text-[11px] leading-[15px] ${CHIP_STYLES[event.kind]}`}
                        >
                          {event.kind === "deadline"
                            ? event.title
                            : `${event.code} · ${formatTime(event.startMin).replace(":00", "")}`}
                        </span>
                      ))}

                    {inMonth && events.length > 2 && (
                      <span className="shrink-0 pl-1 text-[11px] leading-[15px] text-[#8A8A8A]">
                        +{events.length - 2} more
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <DayPanel date={selected} onClose={() => setSelected(null)} source={source} />
      )}
    </div>
  );
}
