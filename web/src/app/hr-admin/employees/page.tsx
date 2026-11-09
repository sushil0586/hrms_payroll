import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeFormOptions, getHrAdminEmployees } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { EmployeeDirectoryWorkspace } from "./employee-directory-workspace";

type SearchParamValue=string|string[]|undefined;
type PageProps={searchParams?:Promise<Record<string,SearchParamValue>>};
const param=(value:SearchParamValue)=>Array.isArray(value)?value[0]:value;

export default async function HrAdminEmployeesPage({searchParams}:PageProps){
 const sessionUser=await requireSessionPermission({permissionKeys:["employees.view","employees.create","employees.edit","employees.import","employees.access.manage"],fallbackPath:"/hr-admin"});
 const [employees,options]=await Promise.all([getHrAdminEmployees(),getHrAdminEmployeeFormOptions()]);
 const params=(await searchParams)??{},rawPage=Number(param(params.page)),rawSize=Number(param(params.page_size));
 const demo=!sessionUser&&employees.state==="demo";
 const permission=(key:string)=>demo||sessionHasPermission(sessionUser,key);
 return <main className="shell hr-admin-compact-ui hr-employee-workbench accerio-page employee-directory-phase2">
  <PageIntro appearance="accerio" eyebrow={employees.state==="live"?"Live employees":"Demo employees"} title="Employees" description="Find employees and manage their profile, access, payout details, and imports within one persistent workspace." className="page-header-surface page-header-surface--compact hr-employee-page-header" titleClassName="text-heading-premium page-title-soft" descriptionClassName="text-body-premium"/>
  <EmployeeDirectoryWorkspace
   initialData={{employees:employees.data,options:options.data,state:employees.state}}
   initialQuery={{q:param(params.q)??"",department:param(params.department)??"all",status:param(params.status)??"all",managerView:param(params.managerView)??"all",readiness:param(params.readiness)??"all",sort:["name","-name","code","-code"].includes(param(params.sort)??"")?param(params.sort)!:"name",page:Number.isSafeInteger(rawPage)&&rawPage>0?rawPage:1,page_size:[5,8,10,25,50].includes(rawSize)?rawSize:8}}
   initialSelectedId={param(params.employeeId)??""}
   initialAction={param(params.create)==="1"?"create":param(params.action)??""}
   initialSaved={param(params.saved)??""}
   permissions={{create:permission("employees.create"),edit:permission("employees.edit"),import:permission("employees.import"),access:permission("employees.access.manage")}}
  />
 </main>;
}
