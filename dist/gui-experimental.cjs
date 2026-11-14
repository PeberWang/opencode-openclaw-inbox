"use strict";Object.defineProperties(exports,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}});const O=require("@opencode/plugin/gui"),M=require("electron"),Z=require("effect"),o=require("solid-js/web"),f=require("solid-js"),ae=O.Ipc.define({id:"opencode-openclaw-inbox.tray",state:Z.Schema.Struct({sessionID:Z.Schema.String,nonce:Z.Schema.Number}),methods:{opened:{input:Z.Schema.Number}}}),G="sidecar",se=6e4;function de(e){const t=e??{};return{prefix:typeof t.prefix=="string"&&t.prefix?t.prefix:"🦞",days:typeof t.days=="number"?t.days:1,max:typeof t.max=="number"?t.max:15,locale:typeof t.locale=="string"&&t.locale?t.locale:"en"}}const fe={title:"OpenClaw tasks",palette:"Open OpenClaw inbox",running:"running",unread:"unread",failed:"failed",done:"done",stopped:"stopped",taken:"taken over",finished:"Task finished",broke:"Task failed",open:"Open",converted:"Now a regular session",convertedHint:"Find it on Home under All projects, or in {project}",empty:"No OpenClaw tasks yet",quiet:"Nothing running or unread",readAll:"Mark all read",openApp:"Open OpenCode",more:"{n} more, see all in OpenCode…",keep:"Unread tasks stay; read ones for {window}",hours:"24 hours",days:"{n} days",now:"just now",ago:" ago",min:"{n}m",hour:"{n}h",day:"{n}d"},ve={title:"OpenClaw 任务",palette:"打开 OpenClaw 收件箱",running:"运行中",unread:"未读",failed:"失败",done:"已完成",stopped:"已中断",taken:"已接手",finished:"任务完成",broke:"任务失败",open:"打开",converted:"已转为普通会话",convertedHint:"主页选「所有项目」或项目「{project}」可以找到",empty:"还没有 OpenClaw 任务",quiet:"没有运行中或未读的任务",readAll:"全部标为已读",openApp:"打开 OpenCode",more:"还有 {n} 个，在 OpenCode 里查看全部…",keep:"未读的一直保留，已读的保留 {window}",hours:"24 小时",days:"{n} 天",now:"刚刚",ago:"前",min:"{n} 分钟",hour:"{n} 小时",day:"{n} 天"};function le(e){return e?.toLowerCase().startsWith("zh")?ve:fe}const Y={running:"🟡",failed:"🔴",unread:"🟢",read:"⚪"},ie={running:0,failed:1,unread:2,read:3};function S(e){return e.busy&&(!e.idle||e.busy>e.idle)?"running":!!e.idle&&(!e.viewed||e.viewed<e.idle)?e.outcome==="failed"?"failed":"unread":"read"}function Q(e){const t={running:0,failed:0,unread:0,read:0};for(const n of e)t[S(n)]++;return t}function ce(e){return[...e].sort((t,n)=>ie[S(t)]-ie[S(n)]||n.updated-t.updated)}function R(e,t){return[t.running&&`${t.running} ${e.running}`,t.unread&&`${t.unread} ${e.unread}`,t.failed&&`${t.failed} ${e.failed}`].filter(Boolean).join(" · ")}function ee(e){return e.split("/").filter(Boolean).pop()??e}function K(e,t){return e.slice(t.length).trim()||e}function re(e,t){if(!t)return"";const n=Math.floor((Date.now()-t)/se);return n<1?e.now:n<60?e.min.replace("{n}",String(n)):n<1440?e.hour.replace("{n}",String(Math.floor(n/60))):e.day.replace("{n}",String(Math.floor(n/1440)))}function te(e,t){const n=S(t),v=t.archived?"":` · ${e.taken}`;if(n==="running")return`${ee(t.directory)} · ${e.running} ${re(e,t.busy)}${v}`;const g=n==="failed"?e.failed:t.outcome==="interrupted"?e.stopped:n==="unread"?`${e.done} · ${e.unread}`:e.done,c=re(e,t.idle??t.updated);return`${ee(t.directory)} · ${g} · ${c===e.now?c:c+e.ago}${v}`}function ge(e,t){return e.keep.replace("{window}",t===1?e.hours:e.days.replace("{n}",String(t)))}function ne(e,t){const n=e.title??"";if(!(!n.startsWith(t)||e.parentID))return{id:e.id,title:n,directory:e.location?.directory??"",archived:!!e.time.archived,updated:e.time.updated,busy:e.time.busy,idle:e.time.idle,viewed:e.time.viewed,outcome:e.outcome}}async function ue(e,t){const n=async c=>(await e.session.list({search:c,limit:100,order:"desc"})).data;let v=await n(t.prefix);v.some(c=>(c.title??"").startsWith(t.prefix))||(v=await n());const g=Date.now()-t.days*24*60*se;return v.map(c=>ne(c,t.prefix)).filter(c=>!!c&&(c.updated>=g||S(c)!=="read"))}async function oe(e,t){await Promise.allSettled(t.filter(n=>n.idle&&(S(n)==="unread"||S(n)==="failed")).map(n=>e.session.view({sessionID:n.id,idle:n.idle})))}const he=3e4,me=["session.created","session.renamed","session.archived","session.unarchived","session.deleted","session.viewed","session.execution.started","session.execution.succeeded","session.execution.failed","session.execution.interrupted"],we=(e,t)=>e.length>t?`${e.slice(0,t-1)}…`:e,be=e=>{if(process.platform!=="darwin")return;const t=de(e.options),n=le(t.locale==="auto"?M.app.getLocale():t.locale),v=()=>e.client;let g=[],c=0,z;const A=new Map,b=e.provide(ae,{state:i=>A.get(i)??{sessionID:"",nonce:0},opened:(i,u)=>{typeof i!="number"||A.get(u.window)?.nonce!==i||(A.delete(u.window),b.changed(u.window))}}),E=()=>e.windows.focused()??e.windows.list().find(i=>!i.isDestroyed()),L=i=>{i.isMinimized()&&i.restore(),i.show(),i.focus(),M.app.focus({steal:!0})},_=(i,u)=>{A.set(i.id,{sessionID:u,nonce:++c}),b.changed(i.id)},j=()=>{M.app.focus({steal:!0}),M.app.emit("activate")},q=i=>{const u=E();if(!u){z=i,j();return}L(u),_(u,i)};e.onCleanup(e.windows.on("open",i=>{if(!z)return;const u=z;z=void 0,_(i,u)}));const W=()=>{const i=E();i?L(i):j()},m=new M.Tray(M.nativeImage.createEmpty()),X=()=>{const i=Q(g),u=["running","unread","failed"].filter(C=>i[C]>0).map(C=>`${Y[C]}${i[C]}`);return u.length?`${t.prefix} ${u.join(" ")}`:t.prefix},B=()=>{const i=Q(g),u=ce(g),C=u.slice(0,t.max),V=u.length-C.length,d=C.length?C.map(h=>({label:we(`${Y[S(h)]}  ${K(h.title,t.prefix)}`,60),sublabel:te(n,h),click:()=>q(h.id)})):[{label:n.empty,enabled:!1}];return M.Menu.buildFromTemplate([{label:`${n.title} · ${R(n,i)||n.quiet}`,enabled:!1},{type:"separator"},...d,...V>0?[{label:n.more.replace("{n}",String(V)),click:W}]:[],{type:"separator"},{label:n.readAll,enabled:i.unread+i.failed>0,click:()=>{oe(v(),g).then(a)}},{label:n.openApp,click:W}])},U=()=>{m.isDestroyed()||(m.setTitle(X()),m.setToolTip(`${n.title} · ${R(n,Q(g))||n.quiet}`))};let D=!1,s=!1;async function a(){if(D){s=!0;return}D=!0;try{g=await ue(v(),t),U()}catch(i){e.log.write("warn","openclaw-inbox refresh failed",{error:String(i)})}finally{D=!1,s&&(s=!1,a())}}let r;const y=()=>{clearTimeout(r),r=setTimeout(()=>{a()},300)},x=()=>{m.popUpContextMenu(B()),y()};m.on("click",x),m.on("right-click",x),U(),a(),e.log.write("info","openclaw-inbox menubar ready",{prefix:t.prefix}),(async()=>{for(;!e.signal.aborted;){try{for await(const i of v().event.subscribe({types:me},{signal:e.signal}))y()}catch(i){if(e.signal.aborted)return;e.log.write("debug","openclaw-inbox event stream dropped",{error:String(i)})}await new Promise(i=>setTimeout(i,3e3))}})();const k=setInterval(()=>{a()},he);return()=>{clearInterval(k),clearTimeout(r),m.destroy()}},ye=`
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
`;var xe=o.template("<button type=button class=oci-badge aria-haspopup=dialog><span class=oci-claw>"),$e=o.template("<button type=button class=oci-link>"),ke=o.template("<div class=oci-pop role=dialog><div class=oci-head><strong></strong><span class=oci-sum></span></div><div class=oci-list></div><div class=oci-foot>"),Ce=o.template("<span class=oci-dot>"),Se=o.template("<span class=oci-count><span class=oci-dot>"),Te=o.template("<div class=oci-empty>"),Oe=o.template("<button type=button class=oci-row><span class=oci-dot></span><span class=oci-text><span class=oci-title></span><span class=oci-detail>");const _e=2e4,Ae=["running","unread","failed"],qe=e=>{const t=de(e.options),n=()=>le(t.locale==="auto"?e.locale.locale():t.locale),v=()=>e.servers.get(G)?.client??e.client,g=s=>v().session.get({sessionID:s}).catch(()=>{}),[c,z]=f.createSignal([]),A=f.createMemo(()=>ce(c())),b=f.createMemo(()=>Q(c()));let E=!1,L=!1;const _=async()=>{if(E){L=!0;return}E=!0;try{z(await ue(v(),t))}catch(s){console.warn("[openclaw-inbox] refresh failed",s)}finally{E=!1,L&&(L=!1,_())}};let j;const q=()=>{clearTimeout(j),j=setTimeout(()=>{_()},250)},W=async s=>{const a=await g(s),r=a&&ne(a,t.prefix);r&&await oe(v(),[r]),q()},m=s=>{e.tabs.open({server:G,id:s},{focus:!0}),W(s)},X=async s=>{const a=await g(s);if(!a?.time.archived||!(a.title??"").startsWith(t.prefix))return;await v().session.update({sessionID:s,archived:!1});const r=n();e.toast.show({title:`${t.prefix} ${r.converted}`,description:r.convertedHint.replace("{project}",ee(a.location?.directory??"")),duration:6e3}),q()},B=async(s,a,r)=>{q();const y=await g(s),x=y&&ne(y,t.prefix);if(!x?.archived||e.sessions.current()?.id===s&&document.hasFocus())return;const $=n(),k=`${t.prefix} ${r?$.broke:$.finished}`;(await e.attention.notify({title:k,message:K(x.title,t.prefix),variant:r?"error":"default",session:{server:G,id:s},id:`openclaw-inbox:${s}:${a}`})).notification||e.toast.show({title:k,description:K(x.title,t.prefix),variant:r?"error":"success",actions:[{label:$.open,run:()=>m(s)}]})};if(O.createKeyed(()=>e.servers.get(G)?.data,s=>{_();const a=s.on;for(const r of["session.created","session.renamed","session.archived","session.unarchived","session.deleted","session.viewed","session.execution.started","session.execution.interrupted"])f.onCleanup(a(r,q));f.onCleanup(a("session.inbox.enqueued",r=>{const y=r.data?.item;if(y?.type!=="user")return;const x=y.payload?.metadata;(x&&Object.keys(x).length>0||e.sessions.current()?.id===r.data.sessionID&&document.hasFocus())&&X(r.data.sessionID).catch(k=>console.warn("[openclaw-inbox] unarchive failed",k))})),f.onCleanup(a("session.execution.succeeded",r=>{B(r.data.sessionID,r.id,!1)})),f.onCleanup(a("session.execution.failed",r=>{B(r.data.sessionID,r.id,!0)}))}),e.app.platform==="desktop"){const s=e.main(ae);O.createKeyed(()=>{const a=s.state();return a&&a.nonce>0?a:void 0},a=>{m(a.sessionID),s.opened(a.nonce).catch(()=>{})},{equals:(a,r)=>a.nonce===r.nonce})}const U=s=>{const[a,r]=f.createSignal(!1),[y,x]=f.createSignal({top:0,right:0});let $,k;const i=()=>{if(!$)return;const d=$.getBoundingClientRect();x({top:Math.round(d.bottom+6),right:Math.max(8,Math.round(window.innerWidth-d.right))})},u=()=>Ae.filter(d=>b()[d]>0),C=()=>["failed","unread","running"].find(d=>b()[d]>0);O.createKeyed(a,()=>{const d=T=>{const p=T.target;!$?.contains(p)&&!k?.contains(p)&&r(!1)},h=T=>{T.key==="Escape"&&r(!1)};document.addEventListener("pointerdown",d,!0),document.addEventListener("keydown",h,!0),window.addEventListener("resize",i),f.onCleanup(()=>{document.removeEventListener("pointerdown",d,!0),document.removeEventListener("keydown",h,!0),window.removeEventListener("resize",i)})}),O.createKeyed(()=>!s.input.active,()=>r(!1));const V=()=>{if(a())return r(!1);i(),r(!0),_()};return o.createComponent(f.Show,{get when(){return c().length>0},get children(){return[(()=>{var d=xe(),h=d.firstChild;d.$$click=V;var T=$;return typeof T=="function"?o.use(T,d):$=d,o.insert(h,()=>t.prefix),o.insert(d,o.createComponent(f.Show,{get when(){return!s.input.compact},get fallback(){return o.createComponent(f.Show,{get when(){return C()},children:p=>(()=>{var w=Ce();return o.effect(()=>o.setAttribute(w,"data-status",p())),w})()})},get children(){return o.createComponent(f.For,{get each(){return u()},children:p=>(()=>{var w=Se(),I=w.firstChild;return o.setAttribute(I,"data-status",p),o.insert(w,()=>b()[p],null),w})()})}}),null),o.effect(p=>{var w=a()?"":void 0,I=u().length===0?"":void 0,N=a(),l=`${n().title}${R(n(),b())?` · ${R(n(),b())}`:""}`;return w!==p.e&&o.setAttribute(d,"data-open",p.e=w),I!==p.t&&o.setAttribute(d,"data-quiet",p.t=I),N!==p.a&&o.setAttribute(d,"aria-expanded",p.a=N),l!==p.o&&o.setAttribute(d,"title",p.o=l),p},{e:void 0,t:void 0,a:void 0,o:void 0}),d})(),o.createComponent(f.Show,{get when(){return a()},get children(){return o.createComponent(o.Portal,{get children(){var d=ke(),h=d.firstChild,T=h.firstChild,p=T.nextSibling,w=h.nextSibling,I=w.nextSibling,N=k;return typeof N=="function"?o.use(N,d):k=d,o.insert(T,()=>n().title),o.insert(p,()=>R(n(),b())||n().quiet),o.insert(h,o.createComponent(f.Show,{get when(){return b().unread+b().failed>0},get children(){var l=$e();return l.$$click=()=>{oe(v(),c()).then(q)},o.insert(l,()=>n().readAll),l}}),null),o.insert(w,o.createComponent(f.For,{get each(){return A()},get fallback(){return(()=>{var l=Te();return o.insert(l,()=>n().empty),l})()},children:l=>(()=>{var P=Oe(),F=P.firstChild,J=F.nextSibling,H=J.firstChild,pe=H.nextSibling;return P.$$click=()=>{r(!1),m(l.id)},o.insert(H,()=>K(l.title,t.prefix)),o.insert(pe,()=>te(n(),l)),o.effect(()=>o.setAttribute(F,"data-status",S(l))),P})()})),o.insert(I,()=>ge(n(),t.days)),o.effect(l=>{var P=n().title,F=e.appearance.mode(),J=`${y().top}px`,H=`${y().right}px`;return P!==l.e&&o.setAttribute(d,"aria-label",l.e=P),F!==l.t&&o.setAttribute(d,"data-mode",l.t=F),J!==l.a&&o.setStyleProperty(d,"top",l.a=J),H!==l.o&&o.setStyleProperty(d,"right",l.o=H),l},{e:void 0,t:void 0,a:void 0,o:void 0}),d}})}})]}})};e.add(O.Style,ye),e.add(O.Slot,{at:"session.header",order:-100,render:s=>o.createComponent(U,{input:s})}),e.add(O.Command,()=>({id:"open",title:n().palette,keywords:"openclaw inbox claw tasks 收件箱 任务",run:async()=>{const s=A();if(s.length===0){e.toast.show({title:n().empty});return}const a=await e.dialogs.select({title:n().title,options:s.map(r=>({title:`${Y[S(r)]} ${K(r.title,t.prefix)}`,description:te(n(),r),value:r.id}))});a&&m(a)}}));const D=setInterval(()=>{_()},_e);return()=>{clearInterval(D),clearTimeout(j)}};o.delegateEvents(["click"]);const Me=O.Plugin.define({setup:qe,main:be});exports.default=Me;
