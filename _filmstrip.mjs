import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage(); await p.setViewport({width:1200,height:760});
await p.goto('https://sindrimar02.github.io/bruin-hotel-preview/restaurant.html',{waitUntil:'networkidle2',timeout:60000});
await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,4000));
const H=await p.evaluate(()=>document.body.scrollHeight-innerHeight);
const N=16;
for (let i=0;i<N;i++){
  const y=Math.round(H*i/(N-1));
  await p.evaluate(v=>window.scrollTo(0,v),y);
  await new Promise(r=>setTimeout(r,900));
  await p.screenshot({path:`_fs-${String(i).padStart(2,'0')}.png`});
}
console.log('docH',H+760);
await b.close();
