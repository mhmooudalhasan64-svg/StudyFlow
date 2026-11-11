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
/* Accessible tabs for the framework-free interactive hero console. */
const heroTabs=[...document.querySelectorAll("[data-hero-tab]")];
const heroPanels=[...document.querySelectorAll("[data-hero-panel]")];
const activateHeroTab=(name)=>{
 heroTabs.forEach(tab=>tab.setAttribute("aria-pressed",String(tab.dataset.heroTab===name)));
 heroPanels.forEach(panel=>{panel.hidden=panel.dataset.heroPanel!==name;});
};
heroTabs.forEach((tab,index)=>tab.addEventListener("click",()=>activateHeroTab(tab.dataset.heroTab)));
heroTabs.forEach((tab,index)=>tab.addEventListener("keydown",event=>{
 if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;
 event.preventDefault();
 const direction=event.key==="ArrowRight"?1:-1;
 const next=heroTabs[(index+direction+heroTabs.length)%heroTabs.length];
 next.focus();
 activateHeroTab(next.dataset.heroTab);
}));
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

/* VAYORA interactive study demo: local tasks, Pomodoro timer, and clearly-labeled AVORA mock. */
const demo=document.getElementById("vayora-demo");
if(demo){
 const taskList=document.getElementById("vayora-task-list");
 const taskForm=document.getElementById("vayora-task-form");
 const taskInput=document.getElementById("vayora-task-input");
 const empty=document.getElementById("vayora-empty");
 const lang=()=>document.documentElement.lang==="en"?"en":"ar";
 const copyText=(ar,en)=>lang()==="en"?en:ar;
 const storageKey="aurevon-vayora-demo-tasks-v1";
 let tasks=[];
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(Array.isArray(saved))tasks=saved.filter(t=>t&&typeof t.text==="string").slice(0,40).map(t=>({id:String(t.id),text:t.text.slice(0,90),done:Boolean(t.done)}));}catch{}
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(tasks));}catch{}};
 const renderTasks=()=>{
  taskList.replaceChildren();
  tasks.forEach(task=>{
   const li=document.createElement("li");li.className="vayora-task"+(task.done?" is-done":"");
   const check=document.createElement("input");check.type="checkbox";check.checked=task.done;check.setAttribute("aria-label",copyText("وضع علامة إنجاز","Mark task complete"));
   check.addEventListener("change",()=>{task.done=check.checked;persist();renderTasks();});
   const label=document.createElement("span");label.textContent=task.text;
   const remove=document.createElement("button");remove.type="button";remove.textContent="×";remove.setAttribute("aria-label",copyText("حذف المهمة","Delete task"));
   remove.addEventListener("click",()=>{tasks=tasks.filter(item=>item.id!==task.id);persist();renderTasks();});
   li.append(check,label,remove);taskList.append(li);
  });
  const done=tasks.filter(t=>t.done).length,left=tasks.length-done;
  document.getElementById("vayora-done").textContent=done;
  document.getElementById("vayora-left").textContent=left;
  document.getElementById("vayora-task-count").textContent=tasks.length;
  document.getElementById("vayora-progress-label").textContent=(tasks.length?Math.round(done/tasks.length*100):0)+"%";
  document.getElementById("vayora-progress-bar").style.width=(tasks.length?done/tasks.length*100:0)+"%";
  empty.hidden=tasks.length>0;
 };
 taskForm.addEventListener("submit",event=>{
  event.preventDefault();const text=taskInput.value.trim();if(!text)return;
  if(tasks.length>=40){empty.textContent=copyText("وصلت إلى الحد الأقصى: 40 مهمة في هذه المعاينة.","Demo limit reached: 40 tasks.");empty.hidden=false;return;}
  tasks.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),text,done:false});persist();renderTasks();taskInput.value="";taskInput.focus();
 });
 if(!tasks.length)tasks=[
  {id:"demo-1",text:copyText("مراجعة درس اليوم","Review today's lesson"),done:false},
  {id:"demo-2",text:copyText("حل خمسة أسئلة تدريبية","Solve five practice questions"),done:false},
  {id:"demo-3",text:copyText("تلخيص النقاط الأساسية","Summarize key points"),done:true}
 ];
 renderTasks();
 let duration=25*60,remaining=duration,interval=null,completedMinutes=0;
 const timer=document.getElementById("vayora-timer"),start=document.getElementById("vayora-timer-start"),reset=document.getElementById("vayora-timer-reset");
 const minutes=document.getElementById("vayora-minutes"),caption=document.getElementById("vayora-timer-caption");
 const renderTimer=()=>{timer.textContent=String(Math.floor(remaining/60)).padStart(2,"0")+":"+String(remaining%60).padStart(2,"0");minutes.innerHTML=completedMinutes+' <i>m</i>';};
 const stopTimer=()=>{if(interval!==null){clearInterval(interval);interval=null;}};
 const resetTimer=()=>{stopTimer();remaining=duration;start.innerHTML=copyText('<span class="lang-ar">ابدأ</span>','<span class="lang-en">Start</span>');start.textContent=copyText("ابدأ","Start");renderTimer();};
 const modeButtons=[...demo.querySelectorAll("[data-vayora-minutes]")];
 modeButtons.forEach(button=>button.addEventListener("click",()=>{stopTimer();duration=Number(button.dataset.vayoraMinutes)*60;remaining=duration;modeButtons.forEach(item=>item.setAttribute("aria-pressed",String(item===button)));start.textContent=copyText("ابدأ","Start");caption.textContent=copyText("جلسة تركيز · "+(duration/60)+" دقيقة","Focus session · "+(duration/60)+" minutes");renderTimer();}));
 start.addEventListener("click",()=>{
  if(interval!==null){stopTimer();start.textContent=copyText("متابعة","Resume");return;}
  if(remaining<=0)remaining=duration;
  start.textContent=copyText("إيقاف مؤقت","Pause");
  interval=setInterval(()=>{
   remaining--;renderTimer();
   if(remaining<=0){stopTimer();completedMinutes+=duration/60;remaining=0;renderTimer();start.textContent=copyText("ابدأ مجدداً","Start again");caption.textContent=copyText("أحسنت! اكتملت جلسة التركيز.","Well done! Focus session completed.");}
  },1000);
 });
 reset.addEventListener("click",()=>{resetTimer();caption.textContent=copyText("جلسة تركيز · "+(duration/60)+" دقيقة","Focus session · "+(duration/60)+" minutes");});
 renderTimer();
 const avoraForm=document.getElementById("vayora-avora-form"),avoraInput=document.getElementById("vayora-avora-input"),avoraResponse=document.getElementById("vayora-avora-response");
 avoraForm.addEventListener("submit",event=>{
  event.preventDefault();const prompt=avoraInput.value.trim();if(!prompt)return;
  const normalized=prompt.toLowerCase();
  let answer;
  if(/وقت|ساعة|مراجعة|schedule|time|hour|revise/.test(normalized))answer=copyText("قسّم وقتك إلى ثلاث مراحل: 5 دقائق لتحديد المطلوب، 40 دقيقة دراسة مركّزة، و15 دقيقة لاسترجاع المعلومات وحل سؤالين. خذ استراحة قصيرة بعدها.","Split your time into three parts: 5 minutes to define the goal, 40 minutes of focused study, and 15 minutes for recall and two practice questions. Then take a short break.");
  else if(/حفظ|ذاكر|تذكر|memor|remember|study/.test(normalized))answer=copyText("اقرأ جزءاً صغيراً، أغلق المصدر، ثم اشرح الفكرة من ذاكرتك. راجع ما نسيته بعد 10 دقائق، ثم في اليوم التالي. الاسترجاع النشط أفضل من إعادة القراءة وحدها.","Study a small section, close the source, and explain it from memory. Revisit what you missed after 10 minutes and again the next day. Active recall is more useful than rereading alone.");
  else answer=copyText("ابدأ بتحديد نتيجة واحدة قابلة للقياس، ثم قسّمها إلى خطوات صغيرة. نفّذ خطوة لمدة 25 دقيقة، واختبر فهمك في النهاية بسؤال أو تلخيص قصير.","Choose one measurable outcome, break it into small steps, and work on one step for 25 minutes. Finish by checking your understanding with a question or a short summary.");
  avoraResponse.textContent=answer;
 });
}

}


/* Copy the official AUREVON contact number on request. */
document.querySelectorAll("[data-copy-phone]").forEach(button=>{
 button.addEventListener("click",async()=>{
  const number=button.dataset.copyPhone;
  const status=button.parentElement.querySelector("[data-copy-status]");
  try{
   await navigator.clipboard.writeText(number);
   const lang=document.documentElement.lang==="en"?"en":"ar";
   if(status)status.textContent=lang==="en"?"Number copied":"تم نسخ الرقم";
  }catch(error){
   if(status)status.textContent=document.documentElement.lang==="en"?"Copy is unavailable in this browser":"تعذر النسخ من هذا المتصفح";
  }
 });
});
