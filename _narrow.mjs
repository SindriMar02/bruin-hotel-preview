import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
for (const W of [415, 390]) {
  const p=await b.newPage(); await p.setViewport({width:W,height:880});
  await p.goto('http://localhost:5321/index.html',{waitUntil:'networkidle2'});
  await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,3500));
  await p.evaluate(()=>{ window.__j=[]; let prev=scrollY;
    // record any frame where the RENDERED scroll position leaps
    const t=()=>{const y=scrollY; if(Math.abs(y-prev)>140) window.__j.push({from:Math.round(prev),to:Math.round(y)}); prev=y; requestAnimationFrame(t);};
    requestAnimationFrame(t);
  });
  await p.mouse.move(W/2,440);
  for (let i=0;i<60;i++){ await p.mouse.wheel({deltaY:110}); await new Promise(r=>setTimeout(r,55)); }
  await new Promise(r=>setTimeout(r,900));
  const a=await p.evaluate(()=>({jumps:window.__j.slice(0,8), n:window.__j.length, y:Math.round(scrollY),
    docH:document.documentElement.scrollHeight,
    filmH:document.querySelector('.br-film')?.getBoundingClientRect().height,
    spacer:document.querySelector('.br-film')?.parentElement?.className,
    overflowX: document.documentElement.scrollWidth - innerWidth }));
  console.log('W='+W, JSON.stringify(a));

  // now the stall test: freeze the main thread, then resume — lagSmoothing(0)
  // means GSAP processes the whole stalled delta in ONE tick
  await p.evaluate(()=>{window.__j.length=0; const t0=Date.now(); while(Date.now()-t0<900){} });
  await new Promise(r=>setTimeout(r,1400));
  const s=await p.evaluate(()=>({afterStall:window.__j.length, jumps:window.__j.slice(0,4),
    frame:document.querySelector('.br-film__canvas')?.dataset.frame,
    clipX:getComputedStyle(document.getElementById('hero')).getPropertyValue('--clip-x').trim()}));
  console.log('   stall->', JSON.stringify(s));
  await p.close();
}
await b.close();
