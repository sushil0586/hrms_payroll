import {WorkspaceStandardHeader} from '@/components/patterns/workspace-standard';
import {getHrAdminLifecycleQueue} from '@/lib/api';
import {collectLifecycleReport,lifecycleAsOf} from '@/lib/lifecycle-report';
import {requireWorkspaceAccess} from '@/lib/workspace-access';
import {LifecycleUnavailable} from '@/app/hr-admin/lifecycle/lifecycle-unavailable';
import {LifecycleAgingReportWorkspace} from './lifecycle-aging-report-workspace';
export default async function ReportPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}) {
 await requireWorkspaceAccess({roleCodes:['hr-admin']});
 const query=await searchParams??{};const asOf=lifecycleAsOf(typeof query.as_of==='string'?query.as_of:undefined);
 let items;
 try {items=await collectLifecycleReport(async page=>{const result=await getHrAdminLifecycleQueue({page,page_size:100});if(result.state!=='live')throw new Error('Live lifecycle report source could not be confirmed.');return result.data;});}
 catch(error){return <LifecycleUnavailable detail={error instanceof Error?error.message:'Live lifecycle report source could not be confirmed.'}/>;}
 return <main className="shell accerio-page lifecycle-phase3 lifecycle-phase3-report"><WorkspaceStandardHeader title="Lifecycle aging and SLA report" description="Complete bounded lifecycle evidence. Filters apply immediately; exports include all matching records." actions={<><a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/reports">Reports</a><a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/lifecycle">Lifecycle inbox</a><a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/reports/lifecycle-queue">Queue evidence</a></>}/><p className="muted">Age and overdue calculations use {asOf} (UTC date). Population is checked across pages; this is not a transactional snapshot.</p><LifecycleAgingReportWorkspace items={items} asOf={asOf}/></main>;
}
