import Link from "next/link";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLaunchRemediations } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { OperationsGovernanceStrip } from "../operations-governance-strip";
import { LaunchRemediationWorkspace } from "./launch-remediation-workspace";

type SearchParamValue=string|string[]|undefined; type PageProps={searchParams?:Promise<Record<string,SearchParamValue>>};
const one=(v:SearchParamValue)=>Array.isArray(v)?v[0]:v;
export default async function HrAdminLaunchRemediationPage({searchParams}:PageProps){
 await requireWorkspaceAccess({roleCodes:["hr-admin"]}); const p=(await searchParams)??{};
 const initialQuery={status:one(p.status)||"open",severity:one(p.severity)||"",owner_role_ref:one(p.owner_role_ref)||"",module_ref:one(p.module_ref)||"",due_state:one(p.due_state)||"",q:one(p.q)||""};
 const result=await getHrAdminLaunchRemediations({status:"all",page:1,page_size:100}); const data=result.data;
 return <main className="shell shell--workspace accerio-page">
  <PageIntro appearance="accerio" eyebrow={result.state==="live"?"Live launch desk":"Demo launch desk"} title="Launch Blockers" description="Route blockers, assign owners, and capture launch-risk decisions." actions={<><Link className="button button--secondary" href="/hr-admin">Dashboard</Link><a className="button button--primary" href="/api/hr-admin/saas-launch-audit/download">Download audit</a></>} pills={["Owner workflow","Tenant scoped","Audit trail"]} showPills/>
  <OperationsGovernanceStrip current="remediation" title="Blocker routing" description="Assign unresolved launch risks, record decisions, and keep gate evidence current." metrics={[{label:"open",value:data.summary.open_count,tone:data.summary.open_count?"warning":"ready"},{label:"blockers",value:data.summary.blocker_count,tone:data.summary.blocker_count?"blocked":"ready"},{label:"overdue",value:data.summary.overdue_count,tone:data.summary.overdue_count?"blocked":"ready"},{label:"escalated",value:data.summary.escalated_count,tone:data.summary.escalated_count?"warning":"ready"}]}/>
  <section className="section"><div className="attendance-summary-strip payroll-run-summary-strip"><span><strong>{data.summary.open_count}</strong> Open assignments</span><span><strong>{data.summary.blocker_count}</strong> Blockers</span><span><strong>{data.summary.warning_count}</strong> Warnings</span><span><strong>{data.summary.overdue_count}</strong> Overdue</span><span><strong>{data.summary.ignored_count}</strong> Ignored decisions</span><span><strong>{data.summary.escalated_count}</strong> Escalated</span></div></section>
  <LaunchRemediationWorkspace initialData={data} initialQuery={initialQuery}/>
 </main>;
}
