"use client";

import {useState} from "react";
import {WorkspaceFilterForm} from "@/components/patterns/workspace-filter-form";
import type {HrAdminEnumOption,HrAdminOptionItem} from "@/lib/types";
import {attendanceDateError,type AttendanceRecordFilters} from "./filter-contract";

export function AttendanceRecordFilterForm({filters,statusOptions,sourceOptions,shiftOptions}: {
  filters: AttendanceRecordFilters;
  statusOptions: HrAdminEnumOption[]; sourceOptions: HrAdminEnumOption[]; shiftOptions: HrAdminOptionItem[];
}) {
  const [error,setError]=useState("");
  return <WorkspaceFilterForm action="/hr-admin/attendance-records" label="Attendance filters" className="attendance-record-filter-bar workspace-filter-form--three" onSubmit={event=>{
    const data=new FormData(event.currentTarget);
    const message=attendanceDateError(String(data.get("from_date")||""),String(data.get("to_date")||""));
    setError(message);
    if(message){event.preventDefault();event.currentTarget.querySelector<HTMLInputElement>('[name="to_date"]')?.focus()}
  }}>
    <input type="hidden" name="page" value="1"/><input type="hidden" name="page_size" value={filters.page_size}/>
    <label className="form-field"><span className="text-label-premium">Search</span><input className="input-control" name="q" defaultValue={filters.q} placeholder="Employee, code, shift, source, date"/></label>
    <label className="form-field"><span className="text-label-premium">Status</span><select className="input-control" name="status" defaultValue={filters.status}><option value="">All statuses</option>{statusOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
    <label className="form-field"><span className="text-label-premium">Source</span><select className="input-control" name="source" defaultValue={filters.source}><option value="">All sources</option>{sourceOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
    <details open={Boolean(filters.shift_id||filters.lock_state||filters.regularized_state||filters.from_date||filters.to_date||filters.late_only)}>
      <summary className="button button--secondary">More filters</summary>
      <div>
        <label className="form-field"><span className="text-label-premium">Shift</span><select className="input-control" name="shift_id" defaultValue={filters.shift_id}><option value="">All shifts</option>{shiftOptions.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="form-field"><span className="text-label-premium">Lock state</span><select className="input-control" name="lock_state" defaultValue={filters.lock_state}><option value="">All rows</option><option value="locked">Locked only</option><option value="open">Open only</option></select></label>
        <label className="form-field"><span className="text-label-premium">Regularization</span><select className="input-control" name="regularized_state" defaultValue={filters.regularized_state}><option value="">All rows</option><option value="regularized">Regularized only</option><option value="not_regularized">Not regularized</option></select></label>
        <label className="form-field"><span className="text-label-premium">From date</span><input className="input-control" type="date" name="from_date" defaultValue={filters.from_date}/></label>
        <label className="form-field"><span className="text-label-premium">To date</span><input className="input-control" type="date" name="to_date" defaultValue={filters.to_date}/></label>
        <label className="toggle-inline"><input type="checkbox" name="late_only" value="1" defaultChecked={filters.late_only}/><span>Late rows only</span></label>
      </div>
    </details>
    <div className="workspace-filter-actions"><button className="button button--primary" type="submit">Apply filters</button><a className="button button--ghost" data-navigation-mode="document" href="/hr-admin/attendance-records">Clear filters</a></div>
    {error?<p className="workspace-filter-validation" role="alert">{error}</p>:null}
  </WorkspaceFilterForm>;
}
