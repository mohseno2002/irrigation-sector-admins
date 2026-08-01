import puppeteer from "puppeteer";
const url=process.argv[2];
const b=await puppeteer.launch({args:["--no-sandbox"],defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2}});
const p=await b.newPage();
// نرصد كل نداء برمجى للتمرير
await p.evaluateOnNewDocument(()=>{
  window.__jumps=[];
  const rec=(k,a)=>{try{window.__jumps.push(k+" "+JSON.stringify(a)+" @y="+Math.round(window.scrollY)+" "+(new Error().stack||"").split("\n")[3]?.trim().slice(0,90));}catch(e){}};
  const st=window.scrollTo.bind(window); window.scrollTo=(...a)=>{rec("scrollTo",a);return st(...a);};
  const sb=window.scrollBy.bind(window); window.scrollBy=(...a)=>{rec("scrollBy",a);return sb(...a);};
  const siv=Element.prototype.scrollIntoView; Element.prototype.scrollIntoView=function(...a){rec("scrollIntoView["+(this.className||this.id)+"]",a);return siv.apply(this,a);};
  const fc=HTMLElement.prototype.focus; HTMLElement.prototype.focus=function(...a){rec("focus["+(this.className||this.id)+"]",a);return fc.apply(this,a);};
});
await p.goto(url,{waitUntil:"networkidle0"});
await p.waitForSelector(".admin-card:not(.skeleton)",{timeout:25000});
await new Promise(r=>setTimeout(r,800));

// سحب حقيقى لأسفل عدة مرات مع تسجيل scrollY
const swipe=async()=>{
  await p.touchscreen.touchStart(200,700);
  for(let i=0;i<12;i++){ await p.touchscreen.touchMove(200,700-i*45); await new Promise(r=>setTimeout(r,16)); }
  await p.touchscreen.touchEnd();
};
for(let k=0;k<4;k++){
  await swipe();
  await new Promise(r=>setTimeout(r,900));
  console.log("بعد سحبة",k+1,"scrollY =",await p.evaluate(()=>Math.round(window.scrollY)));
}
// مراقبة 2 ثانية بدون لمس
const s=await p.evaluate(()=>new Promise(res=>{const o=[];let n=0;const t=()=>{o.push(Math.round(window.scrollY));if(++n<120)requestAnimationFrame(t);else res(o);};requestAnimationFrame(t);}));
console.log("مراقبة بدون لمس: قيم =",[...new Set(s)].slice(0,8));
console.log("نداءات تمرير برمجية:", await p.evaluate(()=>window.__jumps));
await b.close();
