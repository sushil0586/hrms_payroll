"use client";
import {createContext,useContext,useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {HrAdminActionModal} from '@/components/patterns/hr-admin-action-modal';
import {useDocumentUploadDraft} from '@/lib/ui/use-document-upload-draft';
type State={dirty:boolean;busy:boolean};
const Context=createContext<null|{setState:(state:State)=>void;complete:(href:string)=>void;footer:HTMLElement|null}>(null);
export function LifecycleEditorDialog({children,closeHref,title,labelledBy}:{children:ReactNode;closeHref:string;title:string;labelledBy:string}) {
 const [state,setState]=useState<State>({dirty:false,busy:false});const [footer,setFooter]=useState<HTMLElement|null>(null);const navigation=useDocumentUploadDraft(state.dirty,state.busy);
 return <Context.Provider value={{setState,complete:navigation.complete,footer}}><HrAdminActionModal className="lifecycle-phase3-dialog" busy={state.busy} dirty={state.dirty} documentNavigation closeHref={closeHref} onClose={()=>navigation.complete(closeHref)} title={title} labelledBy={labelledBy} footer={<div className="lifecycle-dialog-actions" ref={setFooter}/>}>{children}</HrAdminActionModal></Context.Provider>;
}
export function useLifecycleFormState(value:unknown,initialValue:unknown,busy:boolean,returnHref:string) {
 const context=useContext(Context);const dirty=JSON.stringify(value)!==JSON.stringify(initialValue);
 const ready=useSyncExternalStore(()=>()=>{},()=>true,()=>false);const nav=useDocumentUploadDraft(context?false:dirty,context?false:busy);const update=context?.setState;
 useEffect(()=>{update?.({dirty,busy});},[update,dirty,busy]);
 return {ready,complete:context?.complete??nav.complete,cancel:()=>context?window.dispatchEvent(new Event('hr-admin-modal:request-close')):nav.cancel(returnHref)};
}
export function LifecycleFormActions({children}:{children:ReactNode}) {const ctx=useContext(Context);return ctx?.footer?createPortal(children,ctx.footer):children;}
