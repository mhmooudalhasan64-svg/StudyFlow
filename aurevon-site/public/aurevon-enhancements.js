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
/* Live AUREVON API playground: only endpoints implemented by this server are listed. */
const apiDefinitions={
 health:{method:"GET",path:"/api/system/health",accept:"application/json"},
 og:{method:"GET",path:"/api/og-image?title=AUREVON%20TECH&description=Digital%20products%20and%20intelligent%20experiences",accept:"image/svg+xml"},
 share:{method:"GET",path:"/api/share?share_title=AUREVON%20TECH&share_description=Digital%20products%20and%20intelligent%20experiences",accept:"text/html"}
};
let selectedApi="health";
const apiCode=document.getElementById("api-code");
const apiResponse=document.getElementById("api-response");
const apiStatus=document.getElementById("api-status");
const apiMeta=document.getElementById("api-meta");
const apiRun=document.getElementById("api-run");
const currentLanguage=()=>document.documentElement.lang==="en"?"en":"ar";
const renderApiRequest=()=>{
 const item=apiDefinitions[selectedApi];if(!item||!apiCode)return;
 apiCode.textContent=item.method+" "+window.location.origin+item.path+"\nAccept: "+item.accept;
};
document.querySelectorAll("[data-api]").forEach(button=>button.addEventListener("click",()=>{
 document.querySelectorAll("[data-api]").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
 selectedApi=button.dataset.api;
 renderApiRequest();
 if(apiStatus){apiStatus.className="api-status";apiStatus.textContent=currentLanguage()==="en"?"Ready to test":"جاهز للاختبار";}
 if(apiMeta)apiMeta.textContent=currentLanguage()==="en"?"No request has been sent yet.":"لم يتم إرسال أي طلب بعد.";
 if(apiResponse)apiResponse.textContent=currentLanguage()==="en"?'// Press "Send request" to call the selected live endpoint.':'// اضغط «إرسال الطلب» لتنفيذ طلب حقيقي إلى الخادم.';
}));
if(apiRun&&apiResponse&&apiStatus&&apiMeta){
 apiRun.addEventListener("click",async()=>{
  const item=apiDefinitions[selectedApi];if(!item)return;
  const en=currentLanguage()==="en";
  apiRun.disabled=true;
  apiRun.textContent=en?"Sending…":"جارٍ الإرسال…";
  apiStatus.className="api-status";
  apiStatus.textContent=en?"Request in progress":"الطلب قيد التنفيذ";
  apiResponse.textContent=en?"// Waiting for server response…":"// بانتظار استجابة الخادم…";
  const started=performance.now();
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(item.path,{method:item.method,headers:{Accept:item.accept},cache:"no-store",signal:controller.signal});
   const body=await response.text();
   const elapsed=Math.round(performance.now()-started);
   const contentType=response.headers.get("content-type")||"unknown";
   apiStatus.className="api-status "+(response.ok?"is-success":"is-error");
   apiStatus.textContent="HTTP "+response.status+" "+response.statusText;
   apiMeta.textContent="Duration: "+elapsed+" ms  ·  Content-Type: "+contentType+"  ·  URL: "+new URL(item.path,window.location.origin).pathname;
   let display=body;
   if(contentType.includes("application/json")){try{display=JSON.stringify(JSON.parse(body),null,2);}catch{}}
   apiResponse.textContent=display.slice(0,12000)+(display.length>12000?"\n… response truncated":"");
  }catch(error){
   const timedOut=error&&error.name==="AbortError";
   apiStatus.className="api-status is-error";
   apiStatus.textContent=en?"Request failed":"فشل الطلب";
   apiMeta.textContent=timedOut?(en?"Timed out after 15 seconds":"انتهت مهلة الطلب بعد 15 ثانية"):(en?"The server could not be reached":"تعذر الوصول إلى الخادم");
   apiResponse.textContent=String(error&&error.message||error);
  }finally{
   clearTimeout(timeout);
   apiRun.disabled=false;
   apiRun.textContent=en?"Send request ↗":"إرسال الطلب ↗";
  }
 });
}
renderApiRequest();
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


/* Subtle pointer-following glow: CSS variables only, no framework or animation library. */
const glowCards=document.querySelectorAll(".capability,.panel,.principle,.step");
if(glowCards.length&&window.matchMedia("(hover:hover) and (pointer:fine)").matches&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
 glowCards.forEach(card=>{
  card.addEventListener("pointerenter",event=>{
   if(event.pointerType!=="mouse"&&event.pointerType!=="pen")return;
   card.style.setProperty("--glow-opacity","1");
  });
  card.addEventListener("pointermove",event=>{
   if(event.pointerType!=="mouse"&&event.pointerType!=="pen")return;
   const rect=card.getBoundingClientRect();
   card.style.setProperty("--glow-x",(event.clientX-rect.left)+"px");
   card.style.setProperty("--glow-y",(event.clientY-rect.top)+"px");
  },{passive:true});
  card.addEventListener("pointerleave",()=>{
   card.style.setProperty("--glow-opacity","0");
   card.style.setProperty("--glow-x","50%");
   card.style.setProperty("--glow-y","50%");
  });
 });
}


/* AUREVON adaptive performance mode, OLED palette, live health metrics and conversion tools. */
const toastRegion=document.getElementById("aurevon-toast-region");
window.AUREVONToast=(message)=>{
 if(!toastRegion)return;
 const item=document.createElement("div");item.className="aurevon-toast";item.setAttribute("role","status");item.textContent=message;toastRegion.appendChild(item);
 window.setTimeout(()=>item.remove(),3600);
};
const performanceButton=document.getElementById("performance-toggle");
const oledButton=document.getElementById("oled-toggle");
const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
const performanceKey="aurevon-performance-mode-v1";
const oledKey="aurevon-oled-mode-v1";
let performanceChoice=null;
try{performanceChoice=localStorage.getItem(performanceKey);}catch(error){}
const autoLowBandwidth=!!(connection&&(connection.saveData||/^(slow-2g|2g)$/.test(connection.effectiveType||"")));
const setPerformanceMode=(enabled,notify=false)=>{
 document.documentElement.classList.toggle("aurevon-performance",enabled);
 if(performanceButton)performanceButton.setAttribute("aria-pressed",String(enabled));
 if(notify&&window.AUREVONToast)window.AUREVONToast(enabled?(document.documentElement.lang==="en"?"Performance mode enabled":"تم تفعيل وضع الأداء"):(document.documentElement.lang==="en"?"Full visual mode restored":"تمت استعادة المؤثرات البصرية"));
};
setPerformanceMode(performanceChoice==="on"||(performanceChoice===null&&autoLowBandwidth));
if(performanceButton)performanceButton.addEventListener("click",()=>{
 const enabled=!document.documentElement.classList.contains("aurevon-performance");
 try{localStorage.setItem(performanceKey,enabled?"on":"off");}catch(error){}
 setPerformanceMode(enabled,true);
});
const setOledMode=(enabled,notify=false)=>{
 document.documentElement.dataset.oled=enabled?"true":"false";
 if(oledButton)oledButton.setAttribute("aria-pressed",String(enabled));
 if(notify&&window.AUREVONToast)window.AUREVONToast(enabled?(document.documentElement.lang==="en"?"True black mode enabled":"تم تفعيل الأسود المطلق"):(document.documentElement.lang==="en"?"Standard dark palette restored":"تمت استعادة الوضع الداكن المعتاد"));
};
let savedOled=false;try{savedOled=localStorage.getItem(oledKey)==="on";}catch(error){}
setOledMode(savedOled);
if(oledButton)oledButton.addEventListener("click",()=>{const enabled=document.documentElement.dataset.oled!=="true";try{localStorage.setItem(oledKey,enabled?"on":"off");}catch(error){}setOledMode(enabled,true);});
if(connection&&connection.addEventListener&&performanceChoice===null)connection.addEventListener("change",()=>setPerformanceMode(!!(connection.saveData||/^(slow-2g|2g)$/.test(connection.effectiveType||""))));

/* Quick navigation: Ctrl/Cmd+K, searchable by section name. */
const commandBackdrop=document.getElementById("aurevon-command-backdrop");
const commandSearch=document.getElementById("aurevon-command-search");
const commandList=document.getElementById("aurevon-command-list");
const commandTargets=[
 ["home","الرئيسية","Home"],["about","عن الشركة","About"],["capabilities","مجالاتنا","Capabilities"],["product","المنتج","Product"],["playground","مساحة الدراسة","Study workspace"],["developers","بوابة المطورين","Developer portal"],["live-metrics","مؤشرات الأداء","Live metrics"],["ecosystem","المنظومة","Ecosystem"],["project-estimator","تقدير المشروع","Project estimator"],["process","منهج العمل","Process"],["vision","الرؤية","Vision"],["newsroom","التحديثات","Release notes"],["faq","الأسئلة","FAQ"],["contact","تواصل معنا","Contact"]
];
let commandPreviousFocus=null;
const closeCommand=()=>{commandBackdrop?.classList.remove("open");document.body.style.overflow="";if(commandPreviousFocus?.focus)commandPreviousFocus.focus();};
const renderCommands=(query="")=>{
 if(!commandList)return;
 commandList.replaceChildren();
 const en=document.documentElement.lang==="en";
 const matches=commandTargets.filter(item=>(item[1]+" "+item[2]).toLowerCase().includes(query.toLowerCase()));
 matches.forEach(item=>{
  const button=document.createElement("button");button.type="button";button.className="aurevon-command-item";
  const label=document.createElement("span");label.textContent=en?item[2]:item[1];
  const hint=document.createElement("small");hint.textContent="#"+item[0];button.append(label,hint);
  button.addEventListener("click",()=>{closeCommand();document.getElementById(item[0])?.scrollIntoView({behavior:reducedMotion?"auto":"smooth"});});
  commandList.appendChild(button);
 });
 if(!matches.length){const empty=document.createElement("p");empty.className="aurevon-command-item";empty.textContent=en?"No matching sections":"لا توجد أقسام مطابقة";commandList.appendChild(empty);}
};
const openCommand=()=>{
 if(!commandBackdrop)return;
 commandPreviousFocus=document.activeElement;commandBackdrop.classList.add("open");document.body.style.overflow="hidden";commandSearch.value="";renderCommands();commandSearch.focus();
};
commandSearch?.addEventListener("input",()=>renderCommands(commandSearch.value.trim()));
commandBackdrop?.addEventListener("click",event=>{if(event.target===commandBackdrop)closeCommand();});
document.addEventListener("keydown",event=>{
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();openCommand();}
 if(event.key==="Escape"&&commandBackdrop?.classList.contains("open"))closeCommand();
});
if(navigator.onLine===false)window.AUREVONToast?.(document.documentElement.lang==="en"?"You are currently offline":"الاتصال بالإنترنت غير متاح حالياً");
window.addEventListener("offline",()=>window.AUREVONToast?.(document.documentElement.lang==="en"?"Connection lost":"انقطع الاتصال بالإنترنت"));
window.addEventListener("online",()=>window.AUREVONToast?.(document.documentElement.lang==="en"?"Connection restored":"عاد الاتصال بالإنترنت"));

/* Health data comes from the real server endpoint; RTT is measured in this browser. */
const healthStatus=document.getElementById("aurevon-metric-status");
const healthRtt=document.getElementById("aurevon-metric-rtt");
const healthUptime=document.getElementById("aurevon-metric-uptime");
const healthLabel=document.getElementById("aurevon-health-label");
const healthChecked=document.getElementById("aurevon-metric-checked");
const healthRefresh=document.getElementById("aurevon-metric-refresh");
const formatUptime=seconds=>{
 const total=Math.max(0,Number(seconds)||0),days=Math.floor(total/86400),hours=Math.floor(total%86400/3600),minutes=Math.floor(total%3600/60);
 return days?days+"d "+hours+"h":hours?hours+"h "+minutes+"m":minutes+"m";
};
const checkAurevonHealth=async()=>{
 if(!healthStatus)return;
 const en=document.documentElement.lang==="en";
 healthLabel.textContent=en?"CHECKING…":"جارٍ الفحص…";
 try{
  const start=performance.now();
  const response=await fetch("/api/system/health",{method:"GET",cache:"no-store",headers:{Accept:"application/json"}});
  const elapsed=Math.round(performance.now()-start);
  if(!response.ok)throw new Error("HTTP "+response.status);
  const data=await response.json();
  if(data.status!=="healthy")throw new Error("Service is not healthy");
  healthStatus.textContent=en?"Healthy":"يعمل";
  healthRtt.textContent=elapsed+" ms";
  healthUptime.textContent=formatUptime(data.uptime_seconds);
  healthLabel.textContent=en?"LIVE · VERIFIED":"مباشر · تم التحقق";
  healthChecked.textContent=(en?"Last checked: ":"آخر فحص: ")+new Date().toLocaleTimeString(en?"en":"ar");
 }catch(error){
  healthStatus.textContent=en?"Unavailable":"غير متاح";
  healthRtt.textContent="—";healthUptime.textContent="—";
  healthLabel.textContent=en?"CHECK FAILED":"فشل الفحص";
  healthChecked.textContent=(en?"Could not reach the health endpoint: ":"تعذر الوصول إلى نقطة الصحة: ")+String(error.message||error);
 }
};
healthRefresh?.addEventListener("click",checkAurevonHealth);
if(healthStatus){checkAurevonHealth();window.setInterval(checkAurevonHealth,60000);}

/* Rule-based estimate: transparent planning range, never presented as AI output. */
const estimatorForm=document.getElementById("aurevon-estimator-form");
const estimatorOutput=document.getElementById("aurevon-estimator-output");
estimatorForm?.addEventListener("submit",event=>{
 event.preventDefault();
 const en=document.documentElement.lang==="en";
 const type=document.getElementById("aurevon-estimator-type").value;
 const screens=Math.max(1,Math.min(100,Number(document.getElementById("aurevon-estimator-screens").value)||1));
 const ai=document.getElementById("aurevon-estimator-ai").value;
 const base={website:1.5,webapp:3,mobile:4.5,platform:5.5}[type]||3;
 const complexity=Math.max(0,screens-5)*.18;
 const integration={none:0,basic:1,advanced:2.5}[ai]||0;
 const low=Math.max(1,Math.ceil((base+complexity+integration)*2)/2);
 const high=Math.ceil((base+complexity+integration+1.5)*2)/2;
 const names=en?{website:"Website",webapp:"Web application",mobile:"Mobile application",platform:"Integrated platform"}:{website:"موقع إلكتروني",webapp:"تطبيق ويب",mobile:"تطبيق هاتف",platform:"منصة متكاملة"};
 const aiNames=en?{none:"No AI integration",basic:"Basic AI integration",advanced:"Advanced AI integration"}:{none:"دون تكامل ذكاء اصطناعي",basic:"تكامل ذكاء اصطناعي أساسي",advanced:"تكامل ذكاء اصطناعي متقدم"};
 const range=en?low+"–"+high+" weeks":low+"–"+high+" أسبوع";
 const title=en?"Initial project estimate":"التقدير الأولي للمشروع";
 const steps=en?["Confirm user journeys and acceptance criteria","Prepare UX/UI and technical architecture","Build, integrate and test the agreed scope","Run review, fixes and deployment preparation"]:["تأكيد مسارات المستخدم ومعايير القبول","إعداد تجربة المستخدم والواجهات والبنية التقنية","تطوير النطاق المتفق عليه ودمج الخدمات واختبارها","المراجعة ومعالجة الملاحظات والتحضير للإطلاق"];
 const summary=(en?"Project type: ":"نوع المشروع: ")+names[type]+"\n"+(en?"Screens / pages: ":"عدد الشاشات / الصفحات: ")+screens+"\n"+(en?"AI scope: ":"تكامل الذكاء الاصطناعي: ")+aiNames[ai];
 estimatorOutput.replaceChildren();
 const kicker=document.createElement("div");kicker.className="kicker";kicker.textContent="EXECUTIVE SUMMARY";
 const heading=document.createElement("h3");heading.textContent=title;
 const rangeNode=document.createElement("div");rangeNode.className="aurevon-estimate-range";rangeNode.textContent=range;
 const desc=document.createElement("p");desc.textContent=summary;
 const list=document.createElement("ol");steps.forEach(step=>{const li=document.createElement("li");li.textContent=step;list.appendChild(li);});
 const note=document.createElement("p");note.textContent=en?"Rule-based planning range only. Discovery may change scope and schedule; no price or delivery commitment is implied.":"نطاق تخطيطي قائم على قواعد تقريبية فقط. قد تغيّر مرحلة التحليل النطاق والمدة؛ ولا يمثّل ذلك سعراً أو التزاماً بالتسليم.";
 estimatorOutput.append(kicker,heading,rangeNode,desc,list,note);
 window.AUREVONToast?.(en?"Planning estimate generated":"تم إنشاء التقدير التخطيطي");
});

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
