"use client";
import {useEffect} from 'react';
const key='hrms:lifecycle:return-focus';
function scope(){const url=new URL(window.location.href);for(const name of ['onboardingModal','editOnboarding','reviewModal','editReview','movementModal','editMovement','exitModal','editExit','record','editRecord','recordLoaded'])url.searchParams.delete(name);for(const name of ['page','page_size'])if(!url.searchParams.has(name))url.searchParams.set(name,name==='page'?'1':'25');url.searchParams.sort();return url.pathname+url.search;}
/** Restore the actual queue trigger after deliberate document navigation closes an editor. */
export function LifecycleQueueFocus() {
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);if(params.has('recordLoaded')){const receipt=document.querySelector<HTMLElement>('main .notice[role=status]');if(receipt){receipt.tabIndex=-1;receipt.focus();}}const open=['onboardingModal','editOnboarding','reviewModal','editReview','movementModal','editMovement','exitModal','editExit','record','editRecord'].some(name=>params.has(name));
  if(!open){try{const saved=JSON.parse(sessionStorage.getItem(key)??'null');if(saved?.scope===scope()){const trigger=document.querySelector<HTMLElement>(`[data-lifecycle-trigger="${CSS.escape(saved.trigger)}"]`);const target=trigger??document.querySelector<HTMLElement>(`[data-lifecycle-trigger="${CSS.escape(saved.trigger.replace(/^(record|edit)-/,'inspect-'))}"]`)??document.querySelector<HTMLElement>('main h1');if(target){target.tabIndex=target.tabIndex<0?-1:target.tabIndex;target.focus();}sessionStorage.removeItem(key);}}catch{/* Storage may be unavailable; ordinary native navigation remains usable. */}}
  const remember=(event:MouseEvent)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const anchor=event.target instanceof Element?event.target.closest<HTMLElement>('[data-lifecycle-trigger]'):null;if(anchor)try{sessionStorage.setItem(key,JSON.stringify({scope:scope(),trigger:anchor.dataset.lifecycleTrigger}));}catch{}};
  window.addEventListener('click',remember,true);return()=>window.removeEventListener('click',remember,true);
 },[]);
 return null;
}
