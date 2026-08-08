import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const shot=async(url,name,secs,vw=1440)=>{
  const q=await b.newPage(); await q.setViewport({width:vw,height:900});
  await q.goto(url,{waitUntil:'networkidle2'}); await q.evaluate(()=>document.fonts.ready);
  await new Promise(r=>setTimeout(r,2800));
  for (const s of secs){
    if(s==='top') await q.evaluate(()=>window.scrollTo(0,0));
    else await q.evaluate(id=>document.getElementById(id)?.scrollIntoView({block:'start'}),s);
    await new Promise(r=>setTimeout(r,1100));
    await q.screenshot({path:`_e-${name}-${s}.png`});
  }
  await q.close();
};
await shot('http://localhost:5321/index.html','bruin',['top','menu','the-house']);
await shot('http://localhost:5321/hotel.html','hotel',['top','rooms']);
await shot('http://localhost:5321/about.html','about',['top','our-story']);
await b.close(); console.log('ok');
