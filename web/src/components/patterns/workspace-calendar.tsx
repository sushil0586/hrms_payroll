"use client";

import type { MouseEvent } from "react";

export type WorkspaceCalendarDay = {
  date: string;
  number: number;
  label: string;
  status: string;
  shortStatus: string;
  finalized: boolean;
  selected: boolean;
  href: string;
};

/** Bounded calendar presentation; the caller owns dates, permissions and navigation. */
export function WorkspaceCalendar({ offset, days, onSelect, label = "Attendance calendar", statusKey }: {
  label?: string;
  statusKey?: string;
  offset: number;
  days: WorkspaceCalendarDay[];
  onSelect: (event: MouseEvent<HTMLAnchorElement>, date: string) => void;
}) {
  return <section aria-label={label}>
    <div className="ess-attendance-weekdays" aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="ess-attendance-calendar">
      {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}
      {days.map(day => <a data-navigation-mode="document" key={day.date} href={day.href} onClick={event => onSelect(event, day.date)} className={`ess-attendance-calendar__day${day.selected ? " is-selected" : ""}`} aria-label={day.label} aria-current={day.selected ? "date" : undefined}>
        <strong>{day.number}</strong><span className="ess-attendance-calendar__full">{day.status}</span><span className="ess-attendance-calendar__short" aria-hidden="true">{day.shortStatus}</span>
        {day.finalized ? <><small className="ess-attendance-calendar__full">Finalized</small><small className="ess-attendance-calendar__short" aria-hidden="true">F</small></> : null}
      </a>)}
    </div>
    <details className="ess-attendance-calendar__key"><summary>Status key</summary><p>{statusKey ?? "P Present · A Absent · ½ Half day · L Late · R Remote · Off Weekly off · H Holiday · Lv On leave · ? Unknown · — No record · F Finalized. Select a day for full details."}</p></details>
  </section>;
}
