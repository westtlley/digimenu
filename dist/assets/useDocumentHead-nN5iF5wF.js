import{c as o,r as n,S as c,I as d}from"./main-5wCJ0shd.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]],y=o("House",m);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]],f=o("LayoutGrid",h);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]],g=o("Send",l),s=(e,a)=>{if(!e)return"";try{const t=typeof e=="string"?new Date(e):e;return isNaN(t.getTime())?"":new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",...a}).format(t)}catch(t){return console.error("Error formatting date:",t),""}},p=e=>s(e,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!1}).replace(","," às"),x=e=>s(e,{day:"2-digit",month:"2-digit",year:"numeric"}),k=(e,a)=>{if(!e)return"";try{const[t,r,i]=e.split("-");return a?`${i}/${r}/${t} às ${a}`:`${i}/${r}/${t}`}catch(t){return console.error("Error formatting scheduled date:",t),""}};function S(e){const a=e?.name,t=e?.logo;n.useEffect(()=>{document.title=a&&String(a).trim()?String(a).trim():c},[a]),n.useEffect(()=>{let r=document.querySelector('link[rel="icon"]');r||(r=document.createElement("link"),r.rel="icon",document.head.appendChild(r)),t&&typeof t=="string"&&(t.startsWith("http")||t.startsWith("data:"))?(r.href=t,r.type=t.toLowerCase().includes(".svg")?"image/svg+xml":"image/png"):(r.href=d,r.type="image/svg+xml")},[t])}export{y as H,f as L,g as S,k as a,x as b,p as f,S as u};
