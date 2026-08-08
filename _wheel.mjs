import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
await p.goto('http://localhost:5321/index.html',{waitUntil:'networkidle2'});
await p.evaluate(()=>document.fonts.ready);
await new Promise(r=>setTimeout(r,3500));

await p.evaluate(()=>{
  window.__f=[]; let last=performance.now();
  const tick=()=>{const n=performance.now(); window.__f.push(n-last); last=n; requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
  window.__drift=0;
  const oldGBCR=Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect=function(){window.__drift++;return oldGBCR.call(this);};
});
await p.mouse.move(720,450);
for (let i=0;i<70;i++){ await p.mouse.wheel({deltaY:120}); await new Promise(r=>setTimeout(r,55)); }
await new Promise(r=>setTimeout(r,1200));

const r = await p.evaluate(()=>{
  const f=window.__f.filter(x=>x<500);
  f.sort((a,b)=>a-b);
  const pct=q=>f[Math.floor(f.length*q)];
  return {
    frames:f.length, median:+pct(.5).toFixed(1), p95:+pct(.95).toFixed(1), max:+f[f.length-1].toFixed(1),
    over32:f.filter(x=>x>32).length, over50:f.filter(x=>x>50).length,
    gbcrCalls:window.__drift,
    scrollY:Math.round(scrollY),
    driftEls:document.querySelectorAll('[data-drift]').length,
    frameEls:document.querySelectorAll('.br-frame-in').length
  };
});
console.log(JSON.stringify(r,null,1));
await b.close();
