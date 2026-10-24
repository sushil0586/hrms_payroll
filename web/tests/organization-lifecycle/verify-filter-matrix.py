"""Reconcile browser proofs against the contrasting fixture, independently of API selectors."""
import argparse,json
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--evidence-root',type=Path,required=True);args=parser.parse_args();root=args.evidence_root
proofs=[json.loads(line) for line in (root/'proofs.jsonl').read_text().splitlines()]
expected={
 ('onboardings','status'):{'all':12,'not_started':3,'in_progress':3,'completed':2,'blocked':2,'cancelled':2},
 ('probation-reviews','decision'):{'all':40,'pending':10,'confirm':10,'extend':10,'separate':10},
 ('movements','status'):{'all':12,'draft':2,'pending':2,'approved':2,'rejected':2,'completed':2,'cancelled':2},
 ('movements','movement_type'):{'all':12,'transfer':2,'promotion':2,'designation_change':2,'reporting_change':2,'grade_change':1,'employment_type_change':1,'location_change':1,'other':1},
 ('exits','status'):{'all':12,'draft':2,'pending_approval':2,'approved':2,'clearance_in_progress':2,'completed':2,'cancelled':2},
 ('exits','rehire_eligible'):{'all':12,'yes':6,'no':6},
 ('lifecycle','item_type'):{'all':76,'onboarding':12,'probation':40,'movement':12,'exit':12},
}
sections=['legal_entities','locations','branches','business_units','departments','cost_centers','grades','designations','employment_types'];verified=[]
for engine in ['chromium','firefox','webkit']:
 rows=[x for x in proofs if x['browser']==engine]
 for section in sections:
  actual={x['value']:x['count'] for x in rows if x.get('family')=='organization' and x.get('section')==section and x.get('filter')=='status'};assert actual=={'all':13,'active':7,'inactive':6},(engine,section,actual)
 for (family,key),counts in expected.items():
  actual={x['value']:x['matching'] for x in rows if x.get('family')==family and x.get('filter')==key};assert actual==counts,(engine,family,key,actual,counts);verified.append({'browser':engine,'family':family,'filter':key,'expected_and_actual_counts':actual})
 for kind,family,key in [('onboarding','onboardings','status'),('probation','probation-reviews','decision'),('movement','movements','status'),('exit','exits','status')]:
  actual={x['status']:x['matching'] for x in rows if x.get('family')=='lifecycle' and x.get('filter')=='type/status' and x.get('type')==kind};counts={k:v for k,v in expected[(family,key)].items() if k!='all'};assert actual==counts,(engine,kind,actual,counts)
 for family,count in [('onboardings',6),('probation-reviews',20),('movements',0),('lifecycle',26)]:
  for identifier in ['filter-owner-one','filter-owner-two']:
   hits=[x for x in rows if x.get('family')==family and x.get('filter')=='owner' and x.get('value')=='identifier:'+identifier];assert len(hits)==1 and hits[0]['matching']==count,(engine,family,identifier,hits)
 for family in ['onboardings','probation-reviews','movements','exits','lifecycle']:
  assert {x['value'] for x in rows if x.get('family')==family and x.get('filter')=='page_size'}=={'10','25','50','100'}
 dates=[x for x in rows if x.get('filter')=='primary_date'];assert len(dates)==4
 for x in dates:
  if x['from'] and x['to'] and x['from']>x['to']:assert x['matching']==0
  elif x['from'] and x['from']==x['to']:assert x['matching']==14,x
  else:assert x['matching']>0,x
 fits=[x for x in rows if x.get('kind')=='rows-text-fit'];assert len(fits)==3
 for x in fits:assert x['available']>=x['required']+2
 assert len([x for x in rows if x.get('kind')=='filter-inventory-guard'])==7
result={'status':'passed','fixture_lifecycle_rows_per_engine':76,'organization_sections':9,'engines':3,'finite_filter_value_counts':verified,'all_type_status_pair_counts_verified':True,'populated_owner_class_counts_verified':True,'all_row_sizes_verified':True,'exact_date_count':14,'date_ranges_verified':True,'all_nine_rows_text_fit_checks_verified':True,'filter_inventory_guards_verified':True,'limit':'Dynamic identities and filter combinations are representative, not an exhaustive Cartesian product.'}
(root/'filter-coverage-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'status':'passed','finite_filter_groups':len(verified),'engines':3,'fixture_rows':76}))
