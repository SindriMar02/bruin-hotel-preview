import puppeteer from 'puppeteer-core';
const OUT='/private/tmp/claude-501/-Users-sindri-Documents-Website-redesign-mockups/a7e40b8f-1958-4e1d-9e46-56a6fc7054fd/scratchpad/bruin-assets';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',
  userDataDir:'/private/tmp/claude-501/-Users-sindri-Documents-Website-redesign-mockups/a7e40b8f-1958-4e1d-9e46-56a6fc7054fd/scratchpad/qa-profile',
  args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// loader mid-count
await p.goto('http://localhost:5321/?loader',{waitUntil:'domcontentloaded'});
await sleep(700); await p.screenshot({path:`${OUT}/v2-loader.png`});
await sleep(3800);

await p.goto('http://localhost:5321/',{waitUntil:'networkidle0'});
await p.evaluate(()=>document.fonts.ready);
await sleep(2600);                       // frames pump in
await p.screenshot({path:`${OUT}/v2-hero.png`});

const at=async(f)=>{await p.evaluate(v=>{const H=document.documentElement.scrollHeight-innerHeight;window.scrollTo(0,Math.round(H*v));},f);await sleep(700);};

// the film across its own pin
const st=await p.evaluate(()=>{const s=ScrollTrigger.getAll().find(t=>t.pin);return{start:s.start,dist:s.end-s.start};});
for (const [name,f] of [['film-a',0.04],['film-b',0.5],['film-c',0.96]]){
  await p.evaluate(v=>window.scrollTo(0,v), Math.round(st.start+st.dist*f));
  await sleep(750); await p.screenshot({path:`${OUT}/v2-${name}.png`});
}
// the palette arc
for (const [name,f] of [['day',0.34],['dusk',0.72],['night',0.95]]){
  await at(f); await p.screenshot({path:`${OUT}/v2-${name}.png`});
}
// mobile
await p.setViewport({width:390,height:844});
await p.reload({waitUntil:'networkidle0'});
await p.evaluate(()=>window.scrollTo(0,0));
await sleep(1600); await p.screenshot({path:`${OUT}/v2-mobile.png`});
await b.close(); console.log('v2 shots written');
