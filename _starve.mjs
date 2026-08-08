import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage(); await p.setViewport({width:519,height:774});
await p.goto('http://localhost:5321/index.html',{waitUntil:'networkidle2'});
await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,3200));
const probe = await p.evaluate(async () => {
  const hero=document.getElementById('hero');
  const read=()=>getComputedStyle(hero).getPropertyValue('--clip-x').trim();
  const before=[];
  for (const y of [0,300,700]) { window.scrollTo(0,y); await new Promise(r=>setTimeout(r,500)); before.push(y+':'+read()); }
  // STARVE THE TICKER — exactly what a hidden pane does to rAF
  gsap.ticker.sleep();
  const after=[];
  for (const y of [0,300,700]) { window.scrollTo(0,y); await new Promise(r=>setTimeout(r,500)); after.push(y+':'+read()); }
  return {before, after};
});
console.log('ticker awake :', probe.before.join('  '));
console.log('ticker asleep:', probe.after.join('  '));
await b.close();
