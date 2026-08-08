import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',
  userDataDir:'/private/tmp/claude-501/-Users-sindri-Documents-Website-redesign-mockups/a7e40b8f-1958-4e1d-9e46-56a6fc7054fd/scratchpad/qa-profile',
  args:['--no-sandbox']});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
await p.goto('http://localhost:5321/',{waitUntil:'networkidle0'});
await p.evaluate(()=>document.fonts.ready);
await new Promise(r=>setTimeout(r,2500));   // let the 121 frames pump in
const info=await p.evaluate(()=>{
  const st=ScrollTrigger.getAll().find(t=>t.pin);
  return st?{start:st.start,end:st.end,dist:st.end-st.start}:null;
});
console.log('pin range:',JSON.stringify(info));
const rows=[];
for(const f of [0,0.15,0.3,0.5,0.7,0.85,1]){
  const y=Math.round(info.start+info.dist*f);
  await p.evaluate(v=>window.scrollTo(0,v),y);
  await new Promise(r=>setTimeout(r,600));
  const d=await p.evaluate(()=>{
    const st=ScrollTrigger.getAll().find(t=>t.pin);
    const cv=document.querySelector('.br-film__canvas');
    return {prog:+st.progress.toFixed(3), frame:Number(cv.dataset.frame??-1),
            loaded:window.__loaded??null};
  });
  rows.push({f,y,...d});
}
console.table(rows);
const frames=rows.map(r=>r.frame);
console.log('frame span:',Math.min(...frames),'->',Math.max(...frames),'of 120');
console.log(Math.max(...frames)>=100?'FULL TRAVERSE':'TRUNCATED — frames not loading or scrub mismapped');
await b.close();
