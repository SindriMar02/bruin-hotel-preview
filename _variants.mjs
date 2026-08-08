import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
await p.setViewport({width:1440,height:900});
await p.goto('http://localhost:5321/index.html',{waitUntil:'networkidle2'});
await new Promise(r=>setTimeout(r,3000));
const V=[
 ['A_ink-heavy',   '#462828', .30, 'saturate(1.4) contrast(1.05)'],
 ['B_red-graded',  '#462828', .85, 'brightness(.55) saturate(1.9) sepia(.35) hue-rotate(-18deg) contrast(1.3)'],
 ['C_terracotta',  '#8C2F1C', .55, 'brightness(.7) saturate(1.6) contrast(1.15)'],
 ['D_dark-photo',  '#241F18', .70, 'brightness(.5) saturate(1.5) contrast(1.2)'],
];
for (const [name,bg,op,fil] of V) {
  await p.evaluate((bg,op,fil)=>{
    document.querySelector('.br-hero__glyph-in').style.background=bg;
    const im=document.querySelector('.br-hero__glyph img');
    im.style.opacity=op; im.style.filter=fil;
  },bg,op,fil);
  await new Promise(r=>setTimeout(r,350));
  await p.screenshot({path:`_v-${name}.png`,clip:{x:300,y:300,width:840,height:300}});
}
await b.close();
