import {WorkspaceStandardHeader} from '@/components/patterns/workspace-standard';
export function LifecycleUnavailable({detail="Live lifecycle data could not be confirmed. Reload or return to the inbox."}:{detail?:string}) {
 return <main className="shell accerio-page lifecycle-phase3"><WorkspaceStandardHeader title="Lifecycle data unavailable" description={detail}/><a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/lifecycle">Lifecycle inbox</a></main>;
}
