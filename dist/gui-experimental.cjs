"use strict";Object.defineProperties(exports,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}});const _=require("@opencode/plugin/gui"),V=require("node:fs"),re=require("node:path"),E=require("electron"),Q=require("effect"),o=require("solid-js/web"),f=require("solid-js"),le=_.Ipc.define({id:"opencode-openclaw-inbox.tray",state:Q.Schema.Struct({sessionID:Q.Schema.String,nonce:Q.Schema.Number}),methods:{opened:{input:Q.Schema.Number}}}),Z="sidecar",ce=6e4;function ue(e){const t=e??{};return{prefix:typeof t.prefix=="string"&&t.prefix?t.prefix:"🦞",days:typeof t.days=="number"?t.days:1,max:typeof t.max=="number"?t.max:15,locale:typeof t.locale=="string"&&t.locale?t.locale:"en",header:t.header!==!1,tray:t.tray!==!1}}const he={title:"OpenClaw tasks",palette:"Open OpenClaw inbox",running:"running",unread:"unread",failed:"failed",done:"done",stopped:"stopped",taken:"taken over",finished:"Task finished",broke:"Task failed",open:"Open",converted:"Now a regular session",convertedHint:"Find it on Home under All projects, or in {project}",empty:"No OpenClaw tasks yet",quiet:"Nothing running or unread",readAll:"Mark all read",openApp:"Open OpenCode",more:"{n} more, see all in OpenCode…",keep:"Unread tasks stay; read ones for {window}",hours:"24 hours",days:"{n} days",now:"just now",ago:" ago",min:"{n}m",hour:"{n}h",day:"{n}d"},me={title:"OpenClaw 任务",palette:"打开 OpenClaw 收件箱",running:"运行中",unread:"未读",failed:"失败",done:"已完成",stopped:"已中断",taken:"已接手",finished:"任务完成",broke:"任务失败",open:"打开",converted:"已转为普通会话",convertedHint:"主页选「所有项目」或项目「{project}」可以找到",empty:"还没有 OpenClaw 任务",quiet:"没有运行中或未读的任务",readAll:"全部标为已读",openApp:"打开 OpenCode",more:"还有 {n} 个，在 OpenCode 里查看全部…",keep:"未读的一直保留，已读的保留 {window}",hours:"24 小时",days:"{n} 天",now:"刚刚",ago:"前",min:"{n} 分钟",hour:"{n} 小时",day:"{n} 天"};function pe(e){return e?.toLowerCase().startsWith("zh")?me:he}const ee={running:"🟡",failed:"🔴",unread:"🟢",read:"⚪"},ae={running:0,failed:1,unread:2,read:3};function C(e){return e.busy&&(!e.idle||e.busy>e.idle)?"running":!!e.idle&&(!e.viewed||e.viewed<e.idle)?e.outcome==="failed"?"failed":"unread":"read"}function G(e){const t={running:0,failed:0,unread:0,read:0};for(const n of e)t[C(n)]++;return t}function fe(e){return[...e].sort((t,n)=>ae[C(t)]-ae[C(n)]||n.updated-t.updated)}function W(e,t){return[t.running&&`${t.running} ${e.running}`,t.unread&&`${t.unread} ${e.unread}`,t.failed&&`${t.failed} ${e.failed}`].filter(Boolean).join(" · ")}function te(e){return e.split("/").filter(Boolean).pop()??e}function H(e,t){return e.slice(t.length).trim()||e}function se(e,t){if(!t)return"";const n=Math.floor((Date.now()-t)/ce);return n<1?e.now:n<60?e.min.replace("{n}",String(n)):n<1440?e.hour.replace("{n}",String(Math.floor(n/60))):e.day.replace("{n}",String(Math.floor(n/1440)))}function ne(e,t){const n=C(t),v=t.archived?"":` · ${e.taken}`;if(n==="running")return`${te(t.directory)} · ${e.running} ${se(e,t.busy)}${v}`;const g=n==="failed"?e.failed:t.outcome==="interrupted"?e.stopped:n==="unread"?`${e.done} · ${e.unread}`:e.done,p=se(e,t.idle??t.updated);return`${te(t.directory)} · ${g} · ${p===e.now?p:p+e.ago}${v}`}function we(e,t){return e.keep.replace("{window}",t===1?e.hours:e.days.replace("{n}",String(t)))}function oe(e,t){const n=e.title??"";if(!(!n.startsWith(t)||e.parentID))return{id:e.id,title:n,directory:e.location?.directory??"",archived:!!e.time.archived,updated:e.time.updated,busy:e.time.busy,idle:e.time.idle,viewed:e.time.viewed,outcome:e.outcome}}async function ve(e,t){const n=async p=>(await e.session.list({search:p,limit:100,order:"desc"})).data;let v=await n(t.prefix);v.some(p=>(p.title??"").startsWith(t.prefix))||(v=await n());const g=Date.now()-t.days*24*60*ce;return v.map(p=>oe(p,t.prefix)).filter(p=>!!p&&(p.updated>=g||C(p)!=="read"))}async function ie(e,t){await Promise.allSettled(t.filter(n=>n.idle&&(C(n)==="unread"||C(n)==="failed")).map(n=>e.session.view({sessionID:n.id,idle:n.idle})))}const be=3e4,ye=["session.created","session.renamed","session.archived","session.unarchived","session.deleted","session.viewed","session.execution.started","session.execution.succeeded","session.execution.failed","session.execution.interrupted"],de="open-session",xe=3e4,$e=(e,t)=>e.length>t?`${e.slice(0,t-1)}…`:e,ke=e=>{if(process.platform!=="darwin")return;const t=ue(e.options),n=pe(t.locale==="auto"?E.app.getLocale():t.locale),v=()=>e.client;let g=[],p=0,D;const A=new Map,y=e.provide(le,{state:i=>A.get(i)??{sessionID:"",nonce:0},opened:(i,l)=>{typeof i!="number"||A.get(l.window)?.nonce!==i||(A.delete(l.window),y.changed(l.window))}}),M=()=>e.windows.focused()??e.windows.list().find(i=>!i.isDestroyed()),z=i=>{i.isMinimized()&&i.restore(),i.show(),i.focus(),E.app.focus({steal:!0})},T=(i,l)=>{A.set(i.id,{sessionID:l,nonce:++p}),y.changed(i.id)},I=()=>{E.app.focus({steal:!0}),E.app.emit("activate")},O=i=>{const l=M();if(!l){D=i,I();return}z(l),T(l,i)};e.onCleanup(e.windows.on("open",i=>{if(!D)return;const l=D;D=void 0,T(i,l)}));const K=()=>{const i=M();i?z(i):I()},q=re.join(E.app.getPath("appData"),"opencode-openclaw-inbox"),U=()=>{const i=re.join(q,de);let l;try{l=JSON.parse(V.readFileSync(i,"utf8")),V.unlinkSync(i)}catch{return}typeof l.sessionID!="string"||!l.sessionID.startsWith("ses_")||typeof l.at=="number"&&Date.now()-l.at>xe||(e.log.write("info","openclaw-inbox open request",{sessionID:l.sessionID}),O(l.sessionID))};try{V.mkdirSync(q,{recursive:!0});const i=V.watch(q,(l,r)=>{r===de&&U()});e.onCleanup(()=>i.close()),U()}catch(i){e.log.write("warn","openclaw-inbox cannot watch open requests",{error:String(i)})}if(!t.tray){e.log.write("info","openclaw-inbox menubar disabled by option");return}const S=new E.Tray(E.nativeImage.createEmpty()),X=()=>{const i=G(g),l=["running","unread","failed"].filter(r=>i[r]>0).map(r=>`${ee[r]}${i[r]}`);return l.length?`${t.prefix} ${l.join(" ")}`:t.prefix},Y=()=>{const i=G(g),l=fe(g),r=l.slice(0,t.max),$=l.length-r.length,k=r.length?r.map(c=>({label:$e(`${ee[C(c)]}  ${H(c.title,t.prefix)}`,60),sublabel:ne(n,c),click:()=>O(c.id)})):[{label:n.empty,enabled:!1}];return E.Menu.buildFromTemplate([{label:`${n.title} · ${W(n,i)||n.quiet}`,enabled:!1},{type:"separator"},...k,...$>0?[{label:n.more.replace("{n}",String($)),click:K}]:[],{type:"separator"},{label:n.readAll,enabled:i.unread+i.failed>0,click:()=>{ie(v(),g).then(h)}},{label:n.openApp,click:K}])},d=()=>{S.isDestroyed()||(S.setTitle(X()),S.setToolTip(`${n.title} · ${W(n,G(g))||n.quiet}`))};let s=!1,a=!1;async function h(){if(s){a=!0;return}s=!0;try{g=await ve(v(),t),d()}catch(i){e.log.write("warn","openclaw-inbox refresh failed",{error:String(i)})}finally{s=!1,a&&(a=!1,h())}}let w;const m=()=>{clearTimeout(w),w=setTimeout(()=>{h()},300)},x=()=>{S.popUpContextMenu(Y()),m()};S.on("click",x),S.on("right-click",x),d(),h(),e.log.write("info","openclaw-inbox menubar ready",{prefix:t.prefix}),(async()=>{for(;!e.signal.aborted;){try{for await(const i of v().event.subscribe({types:ye},{signal:e.signal}))m()}catch(i){if(e.signal.aborted)return;e.log.write("debug","openclaw-inbox event stream dropped",{error:String(i)})}await new Promise(i=>setTimeout(i,3e3))}})();const B=setInterval(()=>{h()},be);return()=>{clearInterval(B),clearTimeout(w),S.destroy()}},Se=`
.oci-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--v2-text-text-muted);
  font: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  cursor: default;
}
.oci-badge:hover,
.oci-badge[data-open] {
  background: var(--v2-overlay-simple-overlay-hover);
  color: var(--v2-text-text-base);
}
.oci-badge[data-quiet] .oci-claw {
  opacity: 0.55;
}
.oci-claw {
  font-size: 13px;
  line-height: 1;
}
.oci-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.oci-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--v2-icon-icon-faint);
}
.oci-dot[data-status="running"] { background: var(--v2-state-fg-warning); }
.oci-dot[data-status="unread"] { background: var(--v2-state-fg-success); }
.oci-dot[data-status="failed"] { background: var(--v2-state-fg-danger); }

.oci-pop {
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  width: 420px;
  max-width: calc(100vw - 24px);
  overflow: hidden;
  border: 1px solid var(--v2-border-border-base);
  border-radius: 10px;
  background: var(--v2-background-bg-layer-01);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
  color: var(--v2-text-text-base);
  font-size: 13px;
}
.oci-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 9px;
  border-bottom: 1px solid var(--v2-border-border-muted);
}
.oci-head strong {
  font-size: 13px;
  font-weight: 600;
}
.oci-sum {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--v2-text-text-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oci-link {
  flex-shrink: 0;
  padding: 2px 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--v2-text-text-muted);
  font: inherit;
  font-size: 12px;
  cursor: default;
}
.oci-link:hover {
  background: var(--v2-overlay-simple-overlay-hover);
  color: var(--v2-text-text-base);
}
.oci-list {
  max-height: min(360px, 60vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px;
}
.oci-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: default;
}
.oci-row:hover,
.oci-row:focus-visible {
  background: var(--v2-overlay-simple-overlay-hover);
  outline: none;
}
.oci-pop[data-mode="dark"] .oci-row:hover,
.oci-pop[data-mode="dark"] .oci-row:focus-visible,
.oci-pop[data-mode="dark"] .oci-link:hover {
  background: var(--v2-alpha-light-10);
}
.oci-row .oci-dot {
  margin-top: 6px;
}
.oci-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.oci-title,
.oci-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oci-title {
  font-size: 13px;
  font-weight: 530;
}
.oci-detail {
  color: var(--v2-text-text-muted);
  font-size: 12px;
}
.oci-empty {
  padding: 18px 12px;
  color: var(--v2-text-text-faint);
  font-size: 12px;
  text-align: center;
}
.oci-foot {
  padding: 6px 12px 8px;
  border-top: 1px solid var(--v2-border-border-muted);
  color: var(--v2-text-text-faint);
  font-size: 11px;
}
`;var Ce=o.template("<button type=button class=oci-badge aria-haspopup=dialog><span class=oci-claw>"),_e=o.template("<button type=button class=oci-link>"),Te=o.template("<div class=oci-pop role=dialog><div class=oci-head><strong></strong><span class=oci-sum></span></div><div class=oci-list></div><div class=oci-foot>"),Oe=o.template("<span class=oci-dot>"),qe=o.template("<span class=oci-count><span class=oci-dot>"),Ee=o.template("<div class=oci-empty>"),Ae=o.template("<button type=button class=oci-row><span class=oci-dot></span><span class=oci-text><span class=oci-title></span><span class=oci-detail>");const De=2e4,Me=["running","unread","failed"],ze=e=>{const t=ue(e.options),n=()=>pe(t.locale==="auto"?e.locale.locale():t.locale),v=()=>e.servers.get(Z)?.client??e.client,g=d=>v().session.get({sessionID:d}).catch(()=>{}),[p,D]=f.createSignal([]),A=f.createMemo(()=>fe(p())),y=f.createMemo(()=>G(p()));let M=!1,z=!1;const T=async()=>{if(M){z=!0;return}M=!0;try{D(await ve(v(),t))}catch(d){console.warn("[openclaw-inbox] refresh failed",d)}finally{M=!1,z&&(z=!1,T())}};let I;const O=()=>{clearTimeout(I),I=setTimeout(()=>{T()},250)},K=async d=>{const s=await g(d),a=s&&oe(s,t.prefix);a&&await ie(v(),[a]),O()},q=d=>{e.tabs.open({server:Z,id:d},{focus:!0}),K(d)},U=async d=>{const s=await g(d);if(!s?.time.archived||!(s.title??"").startsWith(t.prefix))return;await v().session.update({sessionID:d,archived:!1});const a=n();e.toast.show({title:`${t.prefix} ${a.converted}`,description:a.convertedHint.replace("{project}",te(s.location?.directory??"")),duration:6e3}),O()},S=async(d,s,a)=>{O();const h=await g(d),w=h&&oe(h,t.prefix);if(!w?.archived||e.sessions.current()?.id===d&&document.hasFocus())return;const m=n(),x=`${t.prefix} ${a?m.broke:m.finished}`;(await e.attention.notify({title:x,message:H(w.title,t.prefix),variant:a?"error":"default",session:{server:Z,id:d},id:`openclaw-inbox:${d}:${s}`})).notification||e.toast.show({title:x,description:H(w.title,t.prefix),variant:a?"error":"success",actions:[{label:m.open,run:()=>q(d)}]})};if(_.createKeyed(()=>e.servers.get(Z)?.data,d=>{T();const s=d.on;for(const a of["session.created","session.renamed","session.archived","session.unarchived","session.deleted","session.viewed","session.execution.started","session.execution.interrupted"])f.onCleanup(s(a,O));f.onCleanup(s("session.inbox.enqueued",a=>{const h=a.data?.item;if(h?.type!=="user")return;const w=h.payload?.metadata;(w&&Object.keys(w).length>0||e.sessions.current()?.id===a.data.sessionID&&document.hasFocus())&&U(a.data.sessionID).catch(x=>console.warn("[openclaw-inbox] unarchive failed",x))})),f.onCleanup(s("session.execution.succeeded",a=>{S(a.data.sessionID,a.id,!1)})),f.onCleanup(s("session.execution.failed",a=>{S(a.data.sessionID,a.id,!0)}))}),e.app.platform==="desktop"){const d=e.main(le);_.createKeyed(()=>{const s=d.state();return s&&s.nonce>0?s:void 0},s=>{q(s.sessionID),d.opened(s.nonce).catch(()=>{})},{equals:(s,a)=>s.nonce===a.nonce})}const X=d=>{const[s,a]=f.createSignal(!1),[h,w]=f.createSignal({top:0,right:0});let m,x;const j=()=>{if(!m)return;const r=m.getBoundingClientRect();w({top:Math.round(r.bottom+6),right:Math.max(8,Math.round(window.innerWidth-r.right))})},B=()=>Me.filter(r=>y()[r]>0),i=()=>["failed","unread","running"].find(r=>y()[r]>0);_.createKeyed(s,()=>{const r=k=>{const c=k.target;!m?.contains(c)&&!x?.contains(c)&&a(!1)},$=k=>{k.key==="Escape"&&a(!1)};document.addEventListener("pointerdown",r,!0),document.addEventListener("keydown",$,!0),window.addEventListener("resize",j),f.onCleanup(()=>{document.removeEventListener("pointerdown",r,!0),document.removeEventListener("keydown",$,!0),window.removeEventListener("resize",j)})}),_.createKeyed(()=>!d.input.active,()=>a(!1));const l=()=>{if(s())return a(!1);j(),a(!0),T()};return o.createComponent(f.Show,{get when(){return p().length>0},get children(){return[(()=>{var r=Ce(),$=r.firstChild;r.$$click=l;var k=m;return typeof k=="function"?o.use(k,r):m=r,o.insert($,()=>t.prefix),o.insert(r,o.createComponent(f.Show,{get when(){return!d.input.compact},get fallback(){return o.createComponent(f.Show,{get when(){return i()},children:c=>(()=>{var b=Oe();return o.effect(()=>o.setAttribute(b,"data-status",c())),b})()})},get children(){return o.createComponent(f.For,{get each(){return B()},children:c=>(()=>{var b=qe(),L=b.firstChild;return o.setAttribute(L,"data-status",c),o.insert(b,()=>y()[c],null),b})()})}}),null),o.effect(c=>{var b=s()?"":void 0,L=B().length===0?"":void 0,N=s(),u=`${n().title}${W(n(),y())?` · ${W(n(),y())}`:""}`;return b!==c.e&&o.setAttribute(r,"data-open",c.e=b),L!==c.t&&o.setAttribute(r,"data-quiet",c.t=L),N!==c.a&&o.setAttribute(r,"aria-expanded",c.a=N),u!==c.o&&o.setAttribute(r,"title",c.o=u),c},{e:void 0,t:void 0,a:void 0,o:void 0}),r})(),o.createComponent(f.Show,{get when(){return s()},get children(){return o.createComponent(o.Portal,{get children(){var r=Te(),$=r.firstChild,k=$.firstChild,c=k.nextSibling,b=$.nextSibling,L=b.nextSibling,N=x;return typeof N=="function"?o.use(N,r):x=r,o.insert(k,()=>n().title),o.insert(c,()=>W(n(),y())||n().quiet),o.insert($,o.createComponent(f.Show,{get when(){return y().unread+y().failed>0},get children(){var u=_e();return u.$$click=()=>{ie(v(),p()).then(O)},o.insert(u,()=>n().readAll),u}}),null),o.insert(b,o.createComponent(f.For,{get each(){return A()},get fallback(){return(()=>{var u=Ee();return o.insert(u,()=>n().empty),u})()},children:u=>(()=>{var P=Ae(),F=P.firstChild,J=F.nextSibling,R=J.firstChild,ge=R.nextSibling;return P.$$click=()=>{a(!1),q(u.id)},o.insert(R,()=>H(u.title,t.prefix)),o.insert(ge,()=>ne(n(),u)),o.effect(()=>o.setAttribute(F,"data-status",C(u))),P})()})),o.insert(L,()=>we(n(),t.days)),o.effect(u=>{var P=n().title,F=e.appearance.mode(),J=`${h().top}px`,R=`${h().right}px`;return P!==u.e&&o.setAttribute(r,"aria-label",u.e=P),F!==u.t&&o.setAttribute(r,"data-mode",u.t=F),J!==u.a&&o.setStyleProperty(r,"top",u.a=J),R!==u.o&&o.setStyleProperty(r,"right",u.o=R),u},{e:void 0,t:void 0,a:void 0,o:void 0}),r}})}})]}})};e.add(_.Style,Se),t.header&&e.add(_.Slot,{at:"session.header",order:-100,render:d=>o.createComponent(X,{input:d})}),e.add(_.Command,()=>({id:"open",title:n().palette,keywords:"openclaw inbox claw tasks 收件箱 任务",run:async()=>{const d=A();if(d.length===0){e.toast.show({title:n().empty});return}const s=await e.dialogs.select({title:n().title,options:d.map(a=>({title:`${ee[C(a)]} ${H(a.title,t.prefix)}`,description:ne(n(),a),value:a.id}))});s&&q(s)}}));const Y=setInterval(()=>{T()},De);return()=>{clearInterval(Y),clearTimeout(I)}};o.delegateEvents(["click"]);const Ie=_.Plugin.define({setup:ze,main:ke});exports.default=Ie;
