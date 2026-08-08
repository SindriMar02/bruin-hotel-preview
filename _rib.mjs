import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
await p.goto('http://localhost:5321/index.html',{waitUntil:'networkidle2'});
await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,3000));
const V={
 'a-fine-red':   ['repeating-linear-gradient(90deg,#8C2F1C 0 5px,#5E1E12 5px 10px)', 0],
 'b-ghost':      ['repeating-linear-gradient(90deg,#8C2F1C 0 5px,#5E1E12 5px 10px)', .34],
 'c-wide-red':   ['repeating-linear-gradient(90deg,#A33A22 0 9px,#65200F 9px 18px)', 0],
 'd-paper-rib':  ['repeating-linear-gradient(90deg,#E4E0D1 0 5px,#8C2F1C 5px 10px)', 0],
 'e-ink-rib':    ['repeating-linear-gradient(90deg,#2F2B22 0 5px,#8C2F1C 5px 10px)', 0],
};
for (const [n,[bg,op]] of Object.entries(V)){
  await p.evaluate((bg,op)=>{
    const gi=document.querySelector('.br-hero__glyph-in'), im=document.querySelector('.br-hero__glyph img');
    gi.style.background=bg; im.style.opacity=op; im.style.display=op?'':'none';
    im.style.filter='saturate(1.3) contrast(1.1)';
  },bg,op);
  await new Promise(r=>setTimeout(r,380));
  await p.screenshot({path:`_r-${n}.png`,clip:{x:250,y:300,width:940,height:300}});
}
await b.close(); console.log('ok');
