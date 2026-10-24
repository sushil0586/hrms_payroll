"use client";

import {useState,useSyncExternalStore,type ReactNode} from "react";

const query = "(min-width: 901px)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change",callback);
  return () => media.removeEventListener("change",callback);
}

/** One set of successful GET controls, even when the mobile disclosure is closed. */
export function EmployeeDirectoryFilters({activeCount,children}: {activeCount:number;children:ReactNode}) {
  const desktop = useSyncExternalStore(subscribe,()=>window.matchMedia(query).matches,()=>true);
  const [expanded,setExpanded] = useState(activeCount>0);
  return <details className="employee-directory-filters" open={desktop||expanded} onToggle={event=>{if(!desktop)setExpanded(event.currentTarget.open)}}>
    <summary className="button button--secondary">Filters{activeCount ? ` (${activeCount} active)` : ""}</summary>
    <div className="employee-directory-filter-fields">{children}</div>
  </details>;
}
