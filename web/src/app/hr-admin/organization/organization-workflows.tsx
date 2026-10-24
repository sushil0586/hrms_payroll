"use client";
import {useState,useSyncExternalStore} from 'react';
import {useDocumentUploadDraft} from '@/lib/ui/use-document-upload-draft';
import type {HrAdminOrganizationSnapshot} from '@/lib/types';
import {OrganizationGuidedSetup} from './organization-guided-setup';
import {OrganizationImportWorkbench} from './organization-import-workbench';
export type OrganizationWorkflowState={dirty:boolean;busy:boolean};
export function OrganizationWorkflows({snapshot}:{snapshot:HrAdminOrganizationSnapshot}) {
 const [tab,setTab]=useState('guided');const [guided,setGuided]=useState({dirty:false,busy:false});const [csv,setCsv]=useState({dirty:false,busy:false});
 const ready=useSyncExternalStore(()=>()=>{},()=>true,()=>false);const busy=guided.busy||csv.busy;
 useDocumentUploadDraft(guided.dirty||csv.dirty,busy);
 return <section className="organization-workflows" aria-label="Organization setup and import"><h2>Setup and import</h2><p>Use guided setup for the initial structure or preview a CSV batch. Drafts stay available when switching tasks.</p><fieldset className="organization-fields" disabled={!ready||busy} data-hydrated={ready}><div className="form-actions-bar__buttons" role="group" aria-label="Choose organization workflow"><button type="button" className="button button--secondary" aria-pressed={tab==='guided'} onClick={()=>setTab('guided')}>Guided setup</button><button type="button" className="button button--secondary" aria-pressed={tab==='csv'} onClick={()=>setTab('csv')}>CSV import</button></div><div hidden={tab!=='guided'}><OrganizationGuidedSetup snapshot={snapshot} onStateChange={setGuided}/></div><div hidden={tab!=='csv'}><OrganizationImportWorkbench snapshot={snapshot} onStateChange={setCsv}/></div></fieldset></section>;
}
