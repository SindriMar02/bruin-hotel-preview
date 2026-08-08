import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
await p.goto('http://localhost:5321/index.html',{waitUntil:'networkidle2'});
await p.evaluate(()=>document.fonts.ready);
await new Promise(r=>setTimeout(r,3000));

// scaffolding the variants need: a knockout mask, a stroked copy, an offset copy
await p.evaluate(()=>{
  const svg=document.getElementById('wmSvg');
  const hero=document.getElementById('hero');
  const NS='http://www.w3.org/2000/svg';
  const t=document.getElementById('wmGlyphText');
  // stroked copy, drawn over everything, hidden by default
  const st=t.cloneNode(true); st.id='wmStroke';
  st.setAttribute('fill','none'); st.setAttribute('stroke','#E4E0D1');
  st.setAttribute('stroke-width','2'); st.style.display='none';
  svg.appendChild(st);
  // knockout mask: paper everywhere in the crop EXCEPT the letters
  const defs=document.querySelector('.br-hero__defs defs');
  const m=document.createElementNS(NS,'mask'); m.id='wmKnock';
  m.setAttribute('maskUnits','userSpaceOnUse');
  const r=document.createElementNS(NS,'rect');
  r.setAttribute('x',0);r.setAttribute('y',0);
  r.setAttribute('width',hero.clientWidth);r.setAttribute('height',hero.clientHeight);
  r.setAttribute('fill','white');
  const u=document.createElementNS(NS,'use'); u.setAttribute('href','#wmGlyphText'); u.setAttribute('fill','black');
  m.appendChild(r); m.appendChild(u); defs.appendChild(m);
});

const reset=()=>p.evaluate(()=>{
  const g=document.getElementById('heroGlyph'), gi=g.querySelector('.br-hero__glyph-in'), im=g.querySelector('img');
  g.style.cssText=''; gi.style.cssText=''; im.style.cssText='';
  g.style.position='absolute'; g.style.inset='0'; g.style.clipPath='url(#wmGlyphs)';
  gi.style.position='absolute'; gi.style.inset='0';
  gi.style.clipPath='inset(var(--clip-y,22%) var(--clip-x,33%))';
  document.getElementById('wmStroke').style.display='none';
  document.getElementById('wmGlyphText').style.opacity='';
});

const LOOKS = {
 '1-rib': ()=>{ const gi=document.querySelector('.br-hero__glyph-in'), im=document.querySelector('.br-hero__glyph img');
   im.style.display='none';
   gi.style.background='repeating-linear-gradient(90deg,#8C2F1C 0 6px,#5E1E12 6px 12px)'; },
 '2-frost': ()=>{ const gi=document.querySelector('.br-hero__glyph-in'), im=document.querySelector('.br-hero__glyph img');
   im.style.display='none';
   gi.style.background='rgba(228,224,209,.30)'; gi.style.backdropFilter='blur(13px) saturate(1.3)'; },
 '3-offset': ()=>{ const g=document.getElementById('heroGlyph'), gi=document.querySelector('.br-hero__glyph-in'), im=document.querySelector('.br-hero__glyph img');
   im.style.display='none'; gi.style.background='#C25A38';
   g.style.transform='translate(9px,9px)'; },
 '4-knockout': ()=>{ const g=document.getElementById('heroGlyph'), gi=document.querySelector('.br-hero__glyph-in'), im=document.querySelector('.br-hero__glyph img');
   im.style.display='none'; gi.style.background='#E4E0D1';
   g.style.clipPath='none'; g.style.mask='url(#wmKnock)'; g.style.webkitMask='url(#wmKnock)';
   document.getElementById('wmGlyphText').style.opacity='0'; },
 '5-outline': ()=>{ const im=document.querySelector('.br-hero__glyph img'), gi=document.querySelector('.br-hero__glyph-in');
   im.style.display='none'; gi.style.background='transparent';
   document.getElementById('wmStroke').style.display='';
   document.getElementById('wmGlyphText').style.opacity='0'; },
 '6-current': ()=>{},
};
for (const [name,fn] of Object.entries(LOOKS)) {
  await reset(); await p.evaluate(fn); await new Promise(r=>setTimeout(r,420));
  await p.screenshot({path:`_l-${name}.png`,clip:{x:250,y:190,width:940,height:530}});
}
await b.close(); console.log('looks rendered');
