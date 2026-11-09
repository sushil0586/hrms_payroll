import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createRequire } from "node:module";
const nodeRequire = createRequire(__filename);
const root = path.resolve(__dirname, "../../..");
const web = path.join(root, "web");
export function componentBundle(beforeReceipt?: string) {
const modules: string[] = [], ids = new Map<string, number>();
function add(file: string): number {
 if(file==='navigation-mock'){if(ids.has(file))return ids.get(file)!;const id=modules.length;ids.set(file,id);modules.push(`function(module,exports){exports.usePathname=()=>{const R=__require(REACT_ID);return R.useSyncExternalStore(fn=>{window.addEventListener('urlchange',fn);window.addEventListener('popstate',fn);return()=>{window.removeEventListener('urlchange',fn);window.removeEventListener('popstate',fn)}},()=>window.location.pathname,()=>'/');};exports.useRouter=()=>({push:path=>history.pushState(null,'',path),back:()=>history.back()});exports.useSearchParams=()=>{const R=__require(REACT_ID);return new URLSearchParams(R.useSyncExternalStore(fn=>{window.addEventListener('urlchange',fn);return()=>window.removeEventListener('urlchange',fn)},()=>window.location.search,()=>''));};}`);return id;}
 if(file==='link-mock'){if(ids.has(file))return ids.get(file)!;const id=modules.length;ids.set(file,id);modules.push(`function(module,exports){module.exports=props=>__require(REACT_ID).createElement('a',props,props.children);}`);return id;}

 if(ids.has(file))return ids.get(file)!;
 const id=modules.length;ids.set(file,id);modules.push('');
 let code=fs.readFileSync(file,'utf8'); if (beforeReceipt && file.endsWith('/action-feedback-receipt.tsx')) code=fs.readFileSync(beforeReceipt,'utf8');
 if(/\.tsx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 code=code.replace(/require\(["']([^"']+)["']\)/g,(_match: string, name: string)=>{
 if(name==='next/navigation')return '__require('+add('navigation-mock')+')';if(name==='next/link')return '__require('+add('link-mock')+')';const target=name.startsWith('@/')?path.join(web,'src',name.slice(2)):name.startsWith('.')?path.resolve(path.dirname(file),name):name;
 let resolved: string;try{const actual=['.tsx','.ts',''].map(ext=>target+ext).find(p=>fs.existsSync(p)&&fs.statSync(p).isFile())||target;resolved=nodeRequire.resolve(actual,{paths:[path.dirname(file),path.join(web,'node_modules')]});}catch(e){throw new Error(name+' in '+file+': '+String(e))}
 return '__require('+add(resolved)+')';
 });
 modules[id]='function(module,exports,__require){'+code+'\n}';return id;
}



const react=add(nodeRequire.resolve("react")),dom=add(nodeRequire.resolve("react-dom/client")),provider=add(path.join(web,"src/components/patterns/action-feedback-provider.tsx")),receipt=add(path.join(web,"src/components/patterns/action-feedback-receipt.tsx")),panel=add(path.join(web,"src/app/mss/approvals/manager-decision-panel.tsx")),modal=add(path.join(web,"src/components/patterns/hr-admin-action-modal.tsx"));
return "var process={env:{NODE_ENV:'development'}};var __modules=["+modules.join(",").replaceAll("REACT_ID",String(react))+"];var __cache={};function __require(id){if(__cache[id])return __cache[id].exports;var m=__cache[id]={exports:{}};__modules[id](m,m.exports,__require);return m.exports;}"+`
const R=__require(${react}),{createRoot}=__require(${dom}),{ActionFeedbackProvider,useActionFeedback}=__require(${provider}),{ActionFeedbackReceipt,rememberActionSuccess}=__require(${receipt}),{ManagerDecisionPanel}=__require(${panel}),{HrAdminActionModal}=__require(${modal});
for(const method of ['pushState','replaceState']){const old=history[method].bind(history);history[method]=(...args)=>{old(...args);window.dispatchEvent(new Event('urlchange'));};}
window.calls=0;
window.fetch=async()=>{window.calls++;if(window.responseMode==='network')throw Error('synthetic');return{ok:window.responseMode==='ok',status:window.responseMode==='ok'?200:500,json:async()=>({status:'approved'})};};
function Body(){const feedback=useActionFeedback(),[child,setChild]=R.useState(true),[modal,setModal]=R.useState(false);const pathname=__require(${ids.get('navigation-mock')}).usePathname();
window.wfa={publish:rememberActionSuccess,success:()=>feedback.success('Action saved.','Synthetic success.'),route:path=>history.pushState(null,'',path),unmount:()=>setChild(false)};
return R.createElement(R.Fragment,null,R.createElement('h1',null,'Synthetic WF-A fixture'),R.createElement('button',{onClick:event=>{event.currentTarget.focus();feedback.success('Action saved.','Synthetic success.');}},'Success'),R.createElement('button',{onClick:event=>{event.currentTarget.focus();feedback.success('Action saved.','Synthetic success.');setChild(false);}},'Save and close child'),R.createElement('button',{onClick:event=>{event.currentTarget.focus();setModal(true);}},'Open modal'),child?R.createElement(ActionFeedbackReceipt,{key:pathname,recordIds:['owned-record']}):null,
window.fixtureMode==='panel'?R.createElement(ManagerDecisionPanel,{itemId:'owned-record',kind:'attendance',status:'pending',state:'live',title:'Synthetic attendance decision',description:'Controlled response fixture',onCompleted:()=>false}):null,
modal?R.createElement(HrAdminActionModal,{title:'Synthetic modal',labelledBy:'synthetic-modal-title',closeHref:location.pathname,onClose:()=>setModal(false)},R.createElement('label',null,'Synthetic field',R.createElement('input')),R.createElement('button',{onClick:()=>setModal(false)},'Cancel')):null);}
function App(){const[scope,setScope]=R.useState('qa:user:membership:hr');window.changeScope=setScope;return R.createElement(ActionFeedbackProvider,{scopeKey:scope},R.createElement(Body));}
createRoot(document.getElementById('root')).render(R.createElement(App));`;
}
