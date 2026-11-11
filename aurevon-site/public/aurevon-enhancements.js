/* Deferred AUREVON feature bundle. Loaded after the primary page becomes idle. */
export function initAurevonEnhancements(){
/* AUREVON progressive enhancements: local playground, docs preview, offline state and subtle depth. */
const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if(!reducedMotion&&"IntersectionObserver" in window){
 document.body.classList.add("motion-ready");
 const revealTargets=document.querySelectorAll(".section-head,.panel,.capability,.step,.principle");
 const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add("is-visible");revealObserver.unobserve(entry.target);}
 }),{threshold:.12,rootMargin:"0px 0px -35px 0px"});
 revealTargets.forEach(target=>revealObserver.observe(target));
}else{
 document.querySelectorAll(".section-head,.panel,.capability,.step,.principle").forEach(target=>target.classList.add("is-visible"));
}
const labType=document.getElementById("lab-type");
const labBrief=document.getElementById("lab-brief");
const labResult=document.getElementById("lab-result");
const labStatus=document.getElementById("lab-status");
const labGenerate=document.getElementById("lab-generate");
const labCopy=document.getElementById("lab-copy");
let latestLabText="";
const labCopyText=(text)=>{if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text);const field=document.createElement("textarea");field.value=text;field.style.position="fixed";field.style.opacity="0";document.body.appendChild(field);field.select();try{document.execCommand("copy");}finally{field.remove();}return Promise.resolve();};
if(labGenerate&&labBrief&&labResult){
 labGenerate.addEventListener("click",()=>{
  const brief=labBrief.value.trim();
  const en=document.documentElement.lang==="en";
  if(!brief){labBrief.focus();labStatus.textContent=en?"ADD A SHORT PROJECT IDEA":"أضف وصفاً مختصراً للفكرة";return;}
  const labels={platform:en?"Digital platform":"منصة رقمية",website:en?"Website":"موقع إلكتروني",learning:en?"Learning product":"منتج تعليمي",automation:en?"Automation":"أتمتة"};
  latestLabText=(en?"Project type: ":"نوع المشروع: ")+labels[labType.value]+"\n"+(en?"Initial brief: ":"وصف الفكرة: ")+brief+"\n"+(en?"Suggested next step: define target users, core workflow, success criteria and technical constraints.":"الخطوة التالية: تحديد المستخدمين المستهدفين، ومسار الاستخدام الأساسي، ومعايير النجاح، والقيود التقنية.");
  labResult.textContent=latestLabText;
  labStatus.textContent=en?"GENERATED LOCALLY · NOT AI":"تم الإنشاء محلياً · ليس ناتج ذكاء اصطناعي";
 });
}
if(labCopy)labCopy.addEventListener("click",async()=>{if(!latestLabText)return;try{await labCopyText(latestLabText);labStatus.textContent=document.documentElement.lang==="en"?"COPIED":"تم النسخ";}catch(error){labStatus.textContent=document.documentElement.lang==="en"?"COPY UNAVAILABLE":"تعذر النسخ";}});
const apiExamples={
 og:'curl -G "'+window.location.origin+'/api/og-image" \\\n  --data-urlencode "title=AUREVON TECH" \\\n  --data-urlencode "description=Digital products and intelligent experiences"\n\n// Live endpoint: returns a generated SVG image.',
 share:'curl -G "'+window.location.origin+'/api/share" \\\n  --data-urlencode "title=AUREVON TECH" \\\n  --data-urlencode "description=Digital products and intelligent experiences"\n\n// Live endpoint: returns HTML with dynamic Open Graph metadata.',

 health:'curl -X GET "https://api.example.com/v1/status" \\\n  -H "Accept: application/json"\n\n// Illustrative contract only.\n// No live API is connected.',
 projects:'curl -X POST "https://api.example.com/v1/projects" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -d \'{"name":"Sample project","type":"platform"}\'\n\n// Example payload only.\n// Endpoint is not deployed.',
 assistant:'curl -X POST "https://api.example.com/v1/assistant/preview" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"prompt":"Summarize this project idea"}\'\n\n// Illustrative request only.\n// Do not send real user data.'
};
document.querySelectorAll("[data-api]").forEach(button=>button.addEventListener("click",()=>{
 document.querySelectorAll("[data-api]").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
 document.getElementById("api-code").textContent=apiExamples[button.dataset.api]||apiExamples.health;
}));
const offlineNotice=document.getElementById("offline-notice");
const updateNetworkState=()=>{if(offlineNotice)offlineNotice.classList.toggle("visible",!navigator.onLine);};
window.addEventListener("online",updateNetworkState);
window.addEventListener("offline",updateNetworkState);
updateNetworkState();
const heroVisual=document.querySelector(".hero .visual");
if(heroVisual&&window.matchMedia("(pointer:fine)").matches&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
 heroVisual.addEventListener("pointermove",event=>{
  const rect=heroVisual.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width-.5;
  const y=(event.clientY-rect.top)/rect.height-.5;
  heroVisual.style.setProperty("--hero-tilt-x",(x*5).toFixed(2)+"deg");
  heroVisual.style.setProperty("--hero-tilt-y",(y*-5).toFixed(2)+"deg");
 });
 heroVisual.addEventListener("pointerleave",()=>{heroVisual.style.setProperty("--hero-tilt-x","0deg");heroVisual.style.setProperty("--hero-tilt-y","0deg");});
}
}
