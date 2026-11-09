import django,json,sys,hashlib
from pathlib import Path
django.setup()
from django.apps import apps
from apps.tenants.models import Tenant
from apps.common.management.commands.manage_playwright_workspace import Command
from apps.documents.models import EmployeeDocument,DocumentLifecycleAuditEvent
m=json.loads(Path(sys.argv[1]).read_text());t=Tenant.objects.get(pk=m['tenant']['id']);Command()._assert_owned(t,sys.argv[2]);before=json.loads(Path(sys.argv[1]).with_name('wfe-protected.json').read_text());after={}
for model in apps.get_app_config('payroll').get_models():
 if any(f.name=='tenant' for f in model._meta.fields):after[model._meta.label]=hashlib.sha256(json.dumps(list(model.objects.filter(tenant=t).order_by('pk').values()),sort_keys=True,default=str).encode()).hexdigest()
changed=[k for k in before if before[k]!=after.get(k)]
assert not set(changed)-{'payroll.PayrollReportExportAudit'}, {'changed_protected_models':changed}
audit_model=apps.get_model('payroll','PayrollReportExportAudit')
audits=list(audit_model.objects.filter(tenant=t).values('report_key','export_type'))
assert all(x['report_key']=='document-compliance' and x['export_type']=='manifest' for x in audits),audits

print(json.dumps({'protected_payroll_hashes_unchanged':not bool(set(changed)-{'payroll.PayrollReportExportAudit'}),'document_report_export_audits':audits,'audit_delta_classification':'Existing cross-module document-report audit table is physically in payroll app; expected append is separately reconciled, all financial input/output model hashes unchanged','protected_model_count':len(after),'documents':list(EmployeeDocument.objects.filter(tenant=t).values('id','status','verification_status','previous_document_id')),'lifecycle_events':DocumentLifecycleAuditEvent.objects.filter(tenant=t).count()},default=str))
