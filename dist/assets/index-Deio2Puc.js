import{c as d,r as n}from"./main-BRmc9wuQ.js";import{e as h}from"./index-Us3IJkK4.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],p=d("ChevronUp",b);function S(r){const[e,o]=n.useState(void 0);return h(()=>{if(r){o({width:r.offsetWidth,height:r.offsetHeight});const c=new ResizeObserver(t=>{if(!Array.isArray(t)||!t.length)return;const f=t[0];let i,s;if("borderBoxSize"in f){const u=f.borderBoxSize,a=Array.isArray(u)?u[0]:u;i=a.inlineSize,s=a.blockSize}else i=r.offsetWidth,s=r.offsetHeight;o({width:i,height:s})});return c.observe(r,{box:"border-box"}),()=>c.unobserve(r)}else o(void 0)},[r]),e}function y(r){const e=n.useRef({value:r,previous:r});return n.useMemo(()=>(e.current.value!==r&&(e.current.previous=e.current.value,e.current.value=r),e.current.previous),[r])}export{p as C,y as a,S as u};
