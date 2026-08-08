import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
await p.goto('http://localhost:5321/index.html',{waitUntil:'networkidle2'});
await p.evaluate(()=>document.fonts.ready);
await new Promise(r=>setTimeout(r,3500));

await p.evaluate(()=>{
  window.__ev=[];
  ScrollTrigger.addEventListener('refresh',()=>window.__ev.push({t:'REFRESH',y:Math.round(scrollY)}));
  ScrollTrigger.addEventListener('refreshInit',()=>window.__ev.push({t:'refreshInit',y:Math.round(scrollY)}));
  let lastH=document.documentElement.scrollHeight;
  window.__hCh=[];
  new ResizeObserver(()=>{const h=document.documentElement.scrollHeight;
    if(Math.abs(h-lastH)>4){window.__hCh.push({y:Math.round(scrollY),from:lastH,to:h});lastH=h;}
  }).observe(document.body);
});

// walk down in realistic increments and watch for position/height/clip anomalies
const rows = await p.evaluate(async () => {
  const out=[]; const H=()=>document.documentElement.scrollHeight;
  const hero=document.getElementById('hero');
  const step=140; let prevY=-1;
  for (let y=0; y<H()-innerHeight; y+=step) {
    window.scrollTo(0,y);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const actual=Math.round(scrollY);
    out.push({
      want:y, got:actual, drift:actual-y,
      docH:H(),
      clipX:getComputedStyle(hero).getPropertyValue('--clip-x').trim(),
      frame:document.querySelector('.br-film__canvas')?.dataset.frame ?? '',
      heroTop:Math.round(hero.getBoundingClientRect().top)
    });
    prevY=actual;
  }
  return out;
});
const ev=await p.evaluate(()=>({ev:window.__ev,h:window.__hCh}));
const heights=[...new Set(rows.map(r=>r.docH))];
console.log('doc heights seen:',heights);
console.log('height changes during scroll:',JSON.stringify(ev.h));
console.log('ScrollTrigger refreshes during scroll:',JSON.stringify(ev.ev));
const drifts=rows.filter(r=>Math.abs(r.drift)>2);
console.log('scroll drift rows:',drifts.length, JSON.stringify(drifts.slice(0,6)));
// clip-x should go 33%->0 in the hero then stay 0
console.log('clipX samples:',rows.slice(0,14).map(r=>`${r.want}:${r.clipX}`).join(' '));
console.log('clipX later:',rows.slice(14).filter((_,i)=>i%8===0).map(r=>`${r.want}:${r.clipX}`).join(' '));
await b.close();
