import puppeteer from 'puppeteer-core';
const B='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b=await puppeteer.launch({executablePath:B,headless:'new',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
for (const [name,url] of [['bruin','http://localhost:5321/index.html'],['hotel','http://localhost:5321/hotel.html']]) {
  const p=await b.newPage();
  const errs=[];
  p.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,180)); });
  p.on('pageerror',e=>errs.push('PAGEERROR '+e.message.slice(0,180)));
  p.on('requestfailed',r=>errs.push('404? '+r.url().split('/').pop()));
  await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
  await p.goto(url,{waitUntil:'networkidle2',timeout:45000});
  await new Promise(r=>setTimeout(r,3200));
  await p.screenshot({path:`_shot-${name}-hero.png`});
  // measure the glyph device
  const m = await p.evaluate(()=>{
    const t=document.getElementById('wmGlyphText');
    const g=document.getElementById('heroGlyph');
    const hero=document.getElementById('hero');
    const tb=t?t.getBBox():null;
    const cs=g?getComputedStyle(g):null;
    return {
      text:t?t.textContent:null,
      fontSize:t?t.getAttribute('font-size'):null,
      bbox: tb?{x:Math.round(tb.x),y:Math.round(tb.y),w:Math.round(tb.width),h:Math.round(tb.height)}:null,
      heroW: hero?Math.round(hero.getBoundingClientRect().width):null,
      heroH: hero?Math.round(hero.getBoundingClientRect().height):null,
      clip: cs?cs.clipPath:null,
      filter: cs?cs.filter:null,
      docH: document.body.scrollHeight,
      sections: [...document.querySelectorAll('main>section')].map(s=>s.id)
    };
  });
  console.log('##',name, JSON.stringify(m));
  console.log('   errors:', errs.length?errs.slice(0,6):'none');
  await p.close();
}
await b.close();
