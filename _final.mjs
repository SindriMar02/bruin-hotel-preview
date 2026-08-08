import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const shot=async(url,name,secs,vw=1440)=>{
  const p=await b.newPage(); await p.setViewport({width:vw,height:900});
  await p.goto(url,{waitUntil:'networkidle2'}); await p.evaluate(()=>document.fonts.ready);
  await new Promise(r=>setTimeout(r,2600));
  for (const s of secs){
    if(s==='hero'){ await p.evaluate(()=>window.scrollTo(0,0)); }
    else await p.evaluate(id=>{const e=document.getElementById(id); if(e) e.scrollIntoView({block:'start'});},s);
    await new Promise(r=>setTimeout(r,1100));
    await p.screenshot({path:`_f-${name}-${s}.png`});
  }
  await p.close();
};
await shot('http://localhost:5321/index.html','bruin',['hero','hollinn','matsedill','husid','hotelid']);
await shot('http://localhost:5321/hotel.html','hotel',['hero','herbergin','beint']);
await shot('http://localhost:5321/index.html','m-bruin',['hero'],390);
await shot('http://localhost:5321/hotel.html','m-hotel',['hero'],390);
await b.close(); console.log('shots done');
