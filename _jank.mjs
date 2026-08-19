import puppeteer from 'puppeteer-core';
const B='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b=await puppeteer.launch({executablePath:B,headless:'new',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const BASE='https://sindrimar02.github.io/bruin-hotel-preview/';
for (const [name,route] of [['landing',''],['restaurant','restaurant.html'],['hotel','hotel.html']]) {
  const p=await b.newPage();
  await p.setViewport({width:1440,height:900});
  await p.goto(BASE+route,{waitUntil:'networkidle2',timeout:60000});
  await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,3500));
  await p.evaluate(()=>{
    window.__f=[]; window.__jump=[]; let last=performance.now(); let prevY=window.scrollY;
    const t=()=>{const n=performance.now(); window.__f.push(n-last); last=n;
      const y=window.scrollY; const d=y-prevY;
      if (Math.abs(d)>170) window.__jump.push({from:Math.round(prevY),to:Math.round(y),d:Math.round(d)});
      prevY=y; requestAnimationFrame(t);};
    requestAnimationFrame(t);
  });
  await p.mouse.move(720,500);
  for (let i=0;i<120;i++){ await p.mouse.wheel({deltaY:110}); await new Promise(r=>setTimeout(r,45)); }
  await new Promise(r=>setTimeout(r,1500));
  const r=await p.evaluate(()=>{
    const f=window.__f.filter(x=>x<600).sort((a,b)=>a-b);
    const q=v=>f[Math.floor(f.length*v)];
    return {frames:f.length, median:+q(.5).toFixed(1), p95:+q(.95).toFixed(1), p99:+q(.99).toFixed(1),
      max:+f[f.length-1].toFixed(1), over32:f.filter(x=>x>32).length, over50:f.filter(x=>x>50).length,
      jumps:window.__jump.length, sample:window.__jump.slice(0,4),
      end:Math.round(scrollY), docH:document.body.scrollHeight};
  });
  console.log(name.padEnd(11), JSON.stringify(r));
  await p.close();
}
await b.close();
