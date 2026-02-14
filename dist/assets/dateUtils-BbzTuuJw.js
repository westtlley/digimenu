import{c as n}from"./main-BRmc9wuQ.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],s=n("Copy",c),i=(r,e)=>{if(!r)return"";try{const t=typeof r=="string"?new Date(r):r;return isNaN(t.getTime())?"":new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",...e}).format(t)}catch(t){return console.error("Error formatting date:",t),""}},d=r=>i(r,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!1}).replace(","," às"),f=r=>i(r,{day:"2-digit",month:"2-digit",year:"numeric"}),u=(r,e)=>{if(!r)return"";try{const[t,o,a]=r.split("-");return e?`${a}/${o}/${t} às ${e}`:`${a}/${o}/${t}`}catch(t){return console.error("Error formatting scheduled date:",t),""}};export{s as C,d as a,u as b,f};
