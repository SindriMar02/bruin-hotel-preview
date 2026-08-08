import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
// the film, scrubbed through its own trigger range
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
await p.goto('http://localhost:5321/index.html',{waitUntil:'networkidle2'});
await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,4200));
for (const [i,f] of [[1,0.04],[2,0.5],[3,0.96]]) {
  const fr = await p.evaluate(async (f)=>{
    const st=ScrollTrigger.getAll().find(t=>t.pin);
    window.scrollTo(0, Math.round(st.start+(st.end-st.start)*f));
    await new Promise(r=>setTimeout(r,900));
    return document.querySelector('.br-film__canvas').dataset.frame;
  }, f);
  await p.screenshot({path:`_film-${i}.png`});
  console.log('film pos',f,'-> frame',fr);
}
await p.close();
const shot=async(url,name,secs)=>{
  const q=await b.newPage(); await q.setViewport({width:1440,height:900});
  await q.goto(url,{waitUntil:'networkidle2'}); await q.evaluate(()=>document.fonts.ready);
  await new Promise(r=>setTimeout(r,2600));
  for (const s of secs){
    if(s==='top') await q.evaluate(()=>window.scrollTo(0,0));
    else await q.evaluate(id=>document.getElementById(id)?.scrollIntoView({block:'start'}),s);
    await new Promise(r=>setTimeout(r,1100));
    await q.screenshot({path:`_u-${name}-${s}.png`});
  }
  await q.close();
};
await shot('http://localhost:5321/um-okkur.html','about',['top','sagan','husin']);
await shot('http://localhost:5321/index.html','bruin',['matsedill','husid']);
await b.close(); console.log('done');
