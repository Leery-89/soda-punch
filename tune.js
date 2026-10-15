// 陀螺仪设置面板（共用）：滑条 + 「−/＋」微调，实时生效，存在本机 localStorage 'sodaTune'，
// 和正式游戏 index.html 的「调手感」是同一份设置。
// 用法：<script src="../tune.js"></script>，然后
//   SodaTune.attach({tilt:()=>({x,y}), calibrate:()=>{}, onOpen, onClose})
//   SodaTune.tiltAxis(角度, 是否反转) -> -1..1；SodaTune.TUNE 读当前参数；SodaTune.open() 打开面板
(()=>{
const DEF={dead:1.5,full:22,speed:210,curve:1,follow:8,tremor:1,invX:false,invY:false};
const TUNE=(()=>{try{return Object.assign({},DEF,JSON.parse(localStorage.getItem('sodaTune')||'{}'))}catch(e){return Object.assign({},DEF)}})();
function save(){try{localStorage.setItem('sodaTune',JSON.stringify(TUNE))}catch(e){}}
// tilt angle -> -1..1 stick value: dead zone, full-speed angle, response curve, inversion
function tiltAxis(v,inv){const a=Math.abs(v)-TUNE.dead;if(a<=0)return 0;const k=Math.min(1,a/Math.max(1,TUNE.full-TUNE.dead));return Math.sign(v)*Math.pow(k,TUNE.curve)*(inv?-1:1)}

const ROWS=[
  ['dead','死区',0,6,.25,'°',2,'歪这么多以内针管不动；端不稳、放下手机还在飘就调大'],
  ['full','满速倾角',8,45,1,'°',0,'歪到这个角度达到最快；调小更灵敏，调大更稳'],
  ['speed','最快速度',80,400,10,'',0,'全速时针管多快；放大视角后还会再按比例变慢'],
  ['curve','细腻曲线',1,2.5,.1,'',1,'1 = 线性；调大后小角度更慢更好瞄，大角度照样快'],
  ['follow','跟手',2,20,1,'',0,'调大指哪到哪，调小更有惯性、更顺滑但会冲过头'],
  ['tremor','手抖强度',0,2,.1,'×',1,'游戏故意加的手抖；1× 原设定，0 完全不抖'],
];

const css=`
.stune{position:fixed;z-index:60;background:rgba(20,26,40,.97);color:#eef3ff;font-family:-apple-system,"PingFang SC","Noto Sans SC",sans-serif;
  display:flex;flex-direction:column;gap:10px;overflow-y:auto;box-sizing:border-box;touch-action:pan-y;-webkit-user-select:none;user-select:none;
  left:0;right:0;bottom:0;max-height:62vh;border-top:2px solid #ffd23f;border-radius:16px 16px 0 0;
  padding:12px max(16px,env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
@media (orientation:landscape){.stune{left:auto;top:0;width:min(50vw,430px);max-height:none;border-top:0;border-left:2px solid #ffd23f;border-radius:16px 0 0 16px;
  padding-top:calc(12px + env(safe-area-inset-top))}}
.stune[hidden]{display:none}
.stune h2{margin:0;font-size:19px;color:#ffd23f}
.stune p{margin:0;font-size:12px;line-height:1.45;color:#a9b6d0}
.stune .live{display:flex;gap:10px;align-items:center}
.stune .stick{flex:none;width:54px;height:54px;border-radius:10px;background:#0d1626;position:relative;box-shadow:inset 0 0 0 1px #ffffff22}
.stune .stick i{position:absolute;left:50%;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#ffd23f;box-shadow:0 0 8px #ffd23f}
.stune .stick b{position:absolute;inset:0;margin:auto;border:1px dashed #ffffff33;border-radius:50%}
.stune .r{display:grid;grid-template-columns:4.6em 34px 1fr 34px 3.4em;gap:6px;align-items:center;font-size:13px}
.stune .r small{grid-column:1/-1;margin-top:-4px;font-size:11px;color:#8fa0bf}
.stune .r output{text-align:right;color:#ffd23f;font-weight:800;font-variant-numeric:tabular-nums}
.stune .r input{width:100%;accent-color:#ffd23f;touch-action:pan-x}
.stune button{font:700 14px -apple-system,"PingFang SC",sans-serif;border-radius:10px;border:1px solid #ffffff30;background:#ffffff14;color:#eef3ff;padding:8px 12px}
.stune .r button{padding:0;height:30px;font-size:18px;line-height:1}
.stune .row{display:flex;gap:8px;flex-wrap:wrap}
.stune .on{color:#ffd23f;border-color:#ffd23f}
.stune .go{background:#ffd23f;color:#3a2a00;border:0}`;

let el,opts={},rowsUI=[],raf=0;
function fmt(k,v){return k==='dead'?(+v).toFixed(2):k==='curve'||k==='tremor'?(+v).toFixed(1):String(Math.round(v))}
function build(){
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  el=document.createElement('div');el.className='stune';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-label','陀螺仪设置');
  el.innerHTML=`<h2>陀螺仪设置</h2><p>拖滑条粗调，点 − / ＋ 一格一格微调，马上生效，设置存在这部手机上（和正式游戏共用）。</p>
    <div class="live"><div class="stick"><b></b><i></i></div><p class="read">倾角 —</p></div><div class="rows"></div>
    <div class="row"><button type="button" data-a="invX"></button><button type="button" data-a="invY"></button></div>
    <div class="row"><button type="button" class="go" data-a="done">好了</button><button type="button" data-a="cal">以当前握姿校准</button><button type="button" data-a="reset">恢复默认</button></div>`;
  const box=el.querySelector('.rows');
  ROWS.forEach(([k,name,mn,mx,step,unit,dec,tip])=>{
    const r=document.createElement('div');r.className='r';
    r.innerHTML=`<span>${name}</span><button type="button" aria-label="${name}减小">−</button><input type="range" min="${mn}" max="${mx}" step="${step}" aria-label="${name}"><button type="button" aria-label="${name}增大">＋</button><output></output><small>${tip}</small>`;
    const [minus,plus]=r.querySelectorAll('button'),inp=r.querySelector('input'),out=r.querySelector('output');
    const set=v=>{v=Math.max(mn,Math.min(mx,Math.round(v/step)*step));TUNE[k]=+v.toFixed(2);if(TUNE.full<TUNE.dead+1)TUNE.full=Math.ceil(TUNE.dead+1);save();show()};
    const show=()=>{inp.value=TUNE[k];out.textContent=fmt(k,TUNE[k])+unit};
    inp.addEventListener('input',()=>set(+inp.value));
    // hold − / ＋ to keep stepping
    [[minus,-1],[plus,1]].forEach(([b,d])=>{let t=0;
      const stop=()=>{clearTimeout(t);clearInterval(t)};
      b.addEventListener('pointerdown',e=>{e.preventDefault();set(TUNE[k]+d*step);t=setTimeout(()=>{t=setInterval(()=>set(TUNE[k]+d*step),90)},400)});
      ['pointerup','pointerleave','pointercancel'].forEach(n=>b.addEventListener(n,stop));
      b.addEventListener('click',e=>{if(e.detail===0)set(TUNE[k]+d*step)})});
    box.appendChild(r);rowsUI.push(show);
  });
  el.addEventListener('click',e=>{const a=e.target.dataset&&e.target.dataset.a;if(!a)return;
    if(a==='invX'||a==='invY'){TUNE[a]=!TUNE[a];save()}
    else if(a==='reset')Object.assign(TUNE,DEF),save();
    else if(a==='cal')opts.calibrate&&opts.calibrate();
    else if(a==='done')close();
    refresh()});
  // keep taps inside the panel from reaching the game underneath
  ['pointerdown','touchstart'].forEach(n=>el.addEventListener(n,e=>e.stopPropagation()));
  document.body.appendChild(el);refresh();
}
function refresh(){rowsUI.forEach(f=>f());el.querySelector('[data-a=invX]').textContent='左右反转：'+(TUNE.invX?'开':'关');el.querySelector('[data-a=invY]').textContent='上下反转：'+(TUNE.invY?'开':'关');
  el.querySelector('[data-a=invX]').classList.toggle('on',TUNE.invX);el.querySelector('[data-a=invY]').classList.toggle('on',TUNE.invY)}
function tick(){if(el.hidden)return;
  const t=opts.tilt?opts.tilt():null,dot=el.querySelector('.stick i');
  if(t){const sx=tiltAxis(t.x,TUNE.invX),sy=tiltAxis(t.y,TUNE.invY);dot.style.transform=`translate(${sx*21}px,${sy*21}px)`;
    el.querySelector('.read').textContent=`倾角 左右 ${t.x.toFixed(1)}° · 上下 ${t.y.toFixed(1)}°，推杆 ${Math.round(sx*100)}% / ${Math.round(sy*100)}%`}
  raf=requestAnimationFrame(tick)}
function open(){if(!el)build();refresh();el.hidden=false;cancelAnimationFrame(raf);tick();opts.onOpen&&opts.onOpen()}
function close(){if(!el)return;el.hidden=true;cancelAnimationFrame(raf);opts.onClose&&opts.onClose()}
function attach(o){opts=o||{}}
window.SodaTune={TUNE,DEF,tiltAxis,save,open,close,attach,isOpen:()=>!!el&&!el.hidden};
})();
