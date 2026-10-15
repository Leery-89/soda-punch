// 奶龙小镇 · 45 度俯视（参考《宝可梦 明亮珍珠》）：three.js 搭的立体小镇，镜头斜 45 度往下看、跟着主角走
// 地面、房子、树是 3D 的；角色还是像素设定图，做成永远面朝镜头的立牌。坐标沿用 844×390 的地图单位：x 向右，z = 地图 y 向下（朝镜头）
// 依赖 town.html 里的全局：G、B、npcs、me、MP、SPR、SHOPS、scene、DLG、townT、tintAt、enterShop、chat、eveningClock、tag、$
'use strict';
const T3=(()=>{
  let R3=null,scene3,cam,rayc,sun,hemi,clock0=0;
  const look={x:420,z:220},lamps=[],winMats=[],spr={},waves=[],bldMesh=[],pickables=[];
  let falls=null,pole=null,heart=null,ready=false,openSig='';
  const UPX=0.75; // 设定图 1 像素 = 0.75 地图单位（针头奶龙高 30，墙高 34）
  // 3D 房子：x 范围和 2D 地图一样，z 是正门那一面；门朝南（朝镜头）
  const BLD={home:{x:130,w:112,front:152,d:56},biscuit:{x:600,w:128,front:150,d:56},hair:{x:150,w:112,front:296,d:56},tattoo:{x:600,w:112,front:296,d:56}};
  const WALL=34,ROOF=24;
  const PAL={home:['#f2e3c6','#c4473a','#a03328'],biscuit:['#ffe3b0','#ffd23f','#ffffff'],hair:['#e6f2ff','#5aa9ff','#3f86d6'],tattoo:['#8a75b0','#7a4fa8','#64408c']};
  // 土路：主路 + 各家门口的岔路（门在正面，岔路绕到门前）
  const PATHS=[[[-90,196],[120,196],['q',160,196,200,188],[420,188],['q',470,188,520,196],[940,196]],
    [[186,192],[186,156]],[[664,196],[664,154]],[[290,192],[290,318],[206,318],[206,300]],[[560,196],[560,318],[656,318],[656,300]],[[420,188],[420,336]],[[420,188],[420,176]]];
  const TREES=[[45,132],[305,124],[785,142],[520,272],[340,282],[55,282],[790,282],[350,104],[515,110],[90,168],[830,170],[760,104],[480,124],[30,230],[860,240],[370,250],[740,250]];
  const LAMPS=[[300,176],[540,178],[760,180],[120,178]];
  const tex=(c,rep)=>{const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping}return t};
  const cnv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')]};
  const lam=(o)=>new THREE.MeshLambertMaterial(o);
  function rnd(seed){let s=seed;return()=>(s=(s*16807)%2147483647)/2147483647}

  function init(){
    if(R3)return;
    R3=new THREE.WebGLRenderer({antialias:true});R3.domElement.id='c3';
    R3.shadowMap.enabled=true;R3.shadowMap.type=THREE.PCFSoftShadowMap;
    document.body.insertBefore(R3.domElement,document.body.firstChild);
    scene3=new THREE.Scene();scene3.background=new THREE.Color('#9fd8ff');scene3.fog=new THREE.Fog('#9fd8ff',900,2200);
    cam=new THREE.PerspectiveCamera(22,1,10,4000);rayc=new THREE.Raycaster();
    hemi=new THREE.HemisphereLight('#e8f4ff','#5a8a3a',0.75);scene3.add(hemi);
    sun=new THREE.DirectionalLight('#fff3d6',0.85);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-520,right:520,top:320,bottom:-320,near:10,far:1400});sun.shadow.bias=-0.0008;
    sun.position.set(420-260,420,220+260);sun.target.position.set(420,0,220);scene3.add(sun,sun.target);
    ground();cliff();water();
    houses();
    TREES.forEach(([x,z])=>tree(x,z,0,1));
    const r=rnd(5);for(let x=-60;x<920;x+=26+r()*16)for(let z=-130;z<50;z+=26+r()*18)tree(x+r()*10,z,46,0.9+r()*0.4);
    board();exitSign();dock();LAMPS.forEach(([x,z])=>lamp(x,z));
    resize();ready=true;
  }
  // ---------- 地面：一张像素贴图（草地、土路、花、沙滩、水） ----------
  const GX0=-120,GZ0=-160,GW=1080,GH=660,GS=2; // 地面范围（地图单位）和每单位几个贴图像素
  function ground(){
    const [c,g]=cnv(GW*GS,GH*GS),X=x=>(x-GX0)*GS,Z=z=>(z-GZ0)*GS;
    for(let z=GZ0;z<GZ0+GH;z+=8)for(let x=GX0;x<GX0+GW;x+=8){g.fillStyle=((x+z)/8)%2?'#6FB24A':'#6AAC46';g.fillRect(X(x),Z(z),8*GS,8*GS)}
    g.fillStyle='#5E9E40';for(let z=GZ0+3;z<GZ0+GH;z+=7)for(let x=GX0+(z%2)*4;x<GX0+GW;x+=11)g.fillRect(X(x),Z(z),GS,2*GS);
    const path=(w,col)=>{g.lineWidth=w*GS;g.strokeStyle=col;g.lineCap='round';g.lineJoin='round';
      PATHS.forEach(pts=>{g.beginPath();pts.forEach((p,i)=>{if(p[0]==='q')g.quadraticCurveTo(X(p[1]),Z(p[2]),X(p[3]),Z(p[4]));else i?g.lineTo(X(p[0]),Z(p[1])):g.moveTo(X(p[0]),Z(p[1]))});g.stroke()})};
    path(28,'#B8743F');path(20,'#DE9A60');
    g.fillStyle='#C9874E';[[300,183],[540,196],[70,194],[740,194],[420,250],[290,240],[560,250]].forEach(([x,z])=>g.fillRect(X(x),Z(z),6*GS,3*GS));
    const r=rnd(11);for(let i=0;i<260;i++){const x=GX0+r()*GW,z=60+r()*260;g.fillStyle=['#ff7fa8','#fff4a8','#ffffff','#b48cff'][Math.floor(r()*4)];g.fillRect(X(x),Z(z),2*GS,2*GS);g.fillRect(X(x)-GS,Z(z)+GS,GS,GS)}
    // 沙滩（左边宽一点）和水
    g.fillStyle='#F2DDA0';g.fillRect(X(GX0),Z(326),GW*GS,14*GS);g.fillRect(X(GX0),Z(326),(300-GX0)*GS,30*GS);
    g.fillStyle='#E8CC88';g.fillRect(X(GX0),Z(354),(300-GX0)*GS,2*GS);g.fillRect(X(300),Z(338),(GX0+GW-300)*GS,2*GS);
    g.fillStyle='#3FA7C9';g.fillRect(X(300),Z(340),(GX0+GW-300)*GS,(GZ0+GH-340)*GS);g.fillRect(X(GX0),Z(356),(300-GX0)*GS,(GZ0+GH-356)*GS);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(GW,GH),lam({map:tex(c)}));m.rotation.x=-Math.PI/2;m.position.set(GX0+GW/2,0,GZ0+GH/2);m.receiveShadow=true;m.userData.ground=true;
    scene3.add(m);pickables.push(m);
  }
  // ---------- 上边的山崖、瀑布 ----------
  function cliff(){
    const [c,g]=cnv(64,24);g.fillStyle='#7A8C8C';g.fillRect(0,0,64,24);g.fillStyle='#6A7A7A';for(let y=3;y<24;y+=6)for(let x=(y*7)%13;x<64;x+=17)g.fillRect(x,y,9,2);
    g.fillStyle='#9DB0AE';g.fillRect(0,0,64,2);
    const face=tex(c,true);face.repeat.set(GW/64,1);
    const top=lam({color:'#4E9E48'}),side=lam({map:face});
    const m=new THREE.Mesh(new THREE.BoxGeometry(GW,46,220),[side,side,top,side,side,side]);m.position.set(GX0+GW/2,23,58-110);m.receiveShadow=m.castShadow=true;scene3.add(m);
    const [fc,fg]=cnv(8,32);fg.fillStyle='#9FE0F2';fg.fillRect(0,0,8,32);fg.fillStyle='#E8FAFF';for(let i=0;i<6;i++)fg.fillRect((i*3)%8,i*5,2,4);
    const ft=tex(fc,true);ft.repeat.set(2,1.5);falls=ft;
    const w=new THREE.Mesh(new THREE.PlaneGeometry(22,46),new THREE.MeshBasicMaterial({map:ft,fog:true}));w.position.set(131,23,58.6);scene3.add(w);
    const foam=new THREE.Mesh(new THREE.CylinderGeometry(16,18,2,12),lam({color:'#C8F0FA'}));foam.position.set(131,1,64);foam.scale.z=0.45;scene3.add(foam);
  }
  function water(){
    const r=rnd(3);for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(14+r()*12,1.6),new THREE.MeshBasicMaterial({color:'#8FD8EC'}));
      m.rotation.x=-Math.PI/2;const x=GX0+40+r()*(GW-80),z=362+r()*120;m.position.set(x,0.3,z);m.userData={x0:x,ph:r()*6};waves.push(m);scene3.add(m)}
  }
  // ---------- 房子：墙（正面画门窗）、坡屋顶、各家的招牌 ----------
  function facade(k,w,locked){
    const pw=Math.round(w/2),ph=17,[c,g]=cnv(pw,ph),[ec,eg]=cnv(pw,ph),p=PAL[k];
    g.fillStyle=p[0];g.fillRect(0,0,pw,ph);g.fillStyle='#0002';g.fillRect(0,ph-2,pw,2);g.fillStyle='#fff3';g.fillRect(0,0,pw,1);
    const dx=Math.round(pw/2)-4;g.fillStyle='#5a3b22';g.fillRect(dx,ph-11,8,11);g.fillStyle='#7a5434';g.fillRect(dx+1,ph-10,6,10);g.fillStyle='#ffd23f';g.fillRect(dx+5,ph-6,1,1);
    eg.fillStyle='#000';eg.fillRect(0,0,pw,ph);
    [[Math.round(pw*0.13),5],[pw-Math.round(pw*0.13)-9,5]].forEach(([x,y])=>{g.fillStyle='#2B1B3D';g.fillRect(x-1,y-1,11,8);g.fillStyle='#9fd8ff';g.fillRect(x,y,9,6);g.fillStyle='#d8f0ff';g.fillRect(x,y,3,2);
      g.fillStyle='#2B1B3D';g.fillRect(x+4,y,1,6);eg.fillStyle='#ffe27a';eg.fillRect(x,y,9,6)});
    if(locked){g.fillStyle='#1b143070';g.fillRect(0,0,pw,ph)}
    return[tex(c),tex(ec)];
  }
  function prism(w,d,h,mat){const s=new THREE.Shape();s.moveTo(-d/2-5,0);s.lineTo(d/2+5,0);s.lineTo(0,h);s.lineTo(-d/2-5,0);
    const m=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:w,bevelEnabled:false}),mat);m.rotation.y=Math.PI/2;m.castShadow=m.receiveShadow=true;return m}
  function houses(){bldMesh.splice(0).forEach(g=>{scene3.remove(g);const i=pickables.indexOf(g);if(i>=0)pickables.splice(i,1)});winMats.length=0;pole=heart=null;
    Object.keys(BLD).forEach(house);openSig=JSON.stringify(G.open)}
  function house(k){
    const b=BLD[k],locked=!G.open[k],p=PAL[k],cx=b.x+b.w/2,cz=b.front-b.d/2,grp=new THREE.Group();grp.userData.k=k;
    const [ft,et]=facade(k,b.w,locked),wallM=lam({color:locked?'#7a7090':p[0]}),win=lam({map:ft,emissive:'#ffffff',emissiveMap:et,emissiveIntensity:0});winMats.push({m:win,k});
    const wall=new THREE.Mesh(new THREE.BoxGeometry(b.w,WALL,b.d),[wallM,wallM,wallM,wallM,win,wallM]);wall.position.set(cx,WALL/2,cz);wall.castShadow=wall.receiveShadow=true;grp.add(wall);
    const rc=locked?'#5a4f70':p[1];
    if(k==='biscuit'){const n=16,sw=(b.w+10)/n;for(let i=0;i<n;i++){const r=prism(sw,b.d,ROOF,lam({color:locked?rc:(i%2?p[2]:p[1])}));r.position.set(b.x-5+i*sw,WALL,cz);grp.add(r)}}
    else{const r=prism(b.w+10,b.d,ROOF,lam({color:rc,flatShading:true}));r.position.set(b.x-5,WALL,cz);grp.add(r);
      const eave=new THREE.Mesh(new THREE.BoxGeometry(b.w+10,2,3),lam({color:locked?'#4a405e':p[2]}));eave.position.set(cx,WALL+1,b.front+4);grp.add(eave)}
    const box=(w,h,d,col,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),lam({color:col}));m.position.set(x,y,z);m.castShadow=true;grp.add(m);return m};
    if(k==='home'){box(10,18,10,'#8a7a6a',b.x+b.w-24,WALL+ROOF-2,cz-8);box(4,26,4,'#ffd23f',cx,WALL+ROOF+11,cz);box(16,4,4,'#ffd23f',cx,WALL+ROOF+16,cz)} // 奶帝十字架
    if(k==='biscuit'){box(34,12,3,'#2B1B3D',cx,WALL+3,b.front+2);box(30,9,3.4,'#e8b46a',cx,WALL+3,b.front+2);
      for(let i=0;i<4;i++)for(let j=0;j<2;j++)box(2,2,0.6,'#7a4a1a',cx-9+i*6,WALL+1+j*4,b.front+3.8)} // 饼干招牌
    if(k==='hair'){const [c,g]=cnv(4,16);for(let i=0;i<16;i++){g.fillStyle=['#c4473a','#ffffff','#2f6fc0'][i%3];g.fillRect(0,i,4,1)}const t=tex(c,true);pole=t;
      const m=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,18,10),lam({map:t}));m.position.set(cx+14,11,b.front+3);grp.add(m)}
    if(k==='tattoo'){const [c,g]=cnv(9,8);g.fillStyle='#ff5fa2';[[1,0,3],[5,0,3],[0,1,9],[0,2,9],[1,3,7],[2,4,5],[3,5,3],[4,6,1]].forEach(([x,y,w])=>g.fillRect(x,y,w,1));
      const m=new THREE.Mesh(new THREE.PlaneGeometry(18,16),new THREE.MeshBasicMaterial({map:tex(c),transparent:true}));m.position.set(cx,WALL+10,b.front+6);heart=m;grp.add(m)}
    if(locked){const [c,g]=cnv(8,9);g.fillStyle='#ffd23f';g.fillRect(0,3,8,6);g.fillRect(1,0,1,4);g.fillRect(6,0,1,4);g.fillRect(1,0,6,1);g.fillStyle='#3a2a00';g.fillRect(3,5,2,2);
      const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex(c)}));s.scale.set(14,16,1);s.position.set(cx,WALL+ROOF/2+4,b.front+8);grp.add(s)}
    grp.traverse(o=>{o.userData.k=k});scene3.add(grp);bldMesh.push(grp);pickables.push(grp);
  }
  function tree(x,z,y0,s){
    const g=new THREE.Group();
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(2,2.6,9,6),lam({color:'#7a4a1a'}));tr.position.y=4.5;
    const c1=new THREE.Mesh(new THREE.IcosahedronGeometry(11,0),lam({color:'#3f9b3a',flatShading:true}));c1.position.y=16;
    const c2=new THREE.Mesh(new THREE.IcosahedronGeometry(7,0),lam({color:'#5cc252',flatShading:true}));c2.position.set(-2,22,2);
    [tr,c1,c2].forEach(m=>{m.castShadow=true;m.receiveShadow=true;g.add(m)});g.position.set(x,y0,z);g.scale.setScalar(s);g.rotation.y=x*0.37;scene3.add(g);
  }
  function board(){
    const g=new THREE.Group(),post=(x)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(2.5,16,2.5),lam({color:'#7A4D2B'}));m.position.set(x,8,0);m.castShadow=true;g.add(m)};post(-11);post(11);
    const [c,cg]=cnv(20,12);cg.fillStyle='#2B1B3D';cg.fillRect(0,0,20,12);cg.fillStyle='#C98A4A';cg.fillRect(1,1,18,10);cg.fillStyle='#FFF4D6';[[3,3,14],[3,6,10],[3,9,12]].forEach(([x,y,w])=>cg.fillRect(x,y,w,1.5));
    const m=new THREE.Mesh(new THREE.BoxGeometry(30,18,3),[lam({color:'#2B1B3D'}),lam({color:'#2B1B3D'}),lam({color:'#2B1B3D'}),lam({color:'#2B1B3D'}),lam({map:tex(cg.canvas)}),lam({color:'#2B1B3D'})]);
    m.position.y=17;m.castShadow=true;g.add(m);g.position.set(420,0,172);g.traverse(o=>o.userData.goal='board');scene3.add(g);pickables.push(g);
  }
  function exitSign(){
    const g=new THREE.Group(),p=new THREE.Mesh(new THREE.BoxGeometry(2.5,18,2.5),lam({color:'#7A4D2B'}));p.position.y=9;g.add(p);
    const a=new THREE.Mesh(new THREE.BoxGeometry(22,7,2),lam({color:'#8A5A34'}));a.position.set(-6,15,0);g.add(a);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(5,7,3),lam({color:'#8A5A34'}));tip.rotation.z=Math.PI/2;tip.position.set(-20,15,0);g.add(tip);
    g.position.set(26,0,178);g.traverse(o=>{o.castShadow=true;o.userData.goal='exit'});scene3.add(g);pickables.push(g);
  }
  function dock(){const m=lam({color:'#A8703E'}),d=new THREE.Mesh(new THREE.BoxGeometry(18,3,48),m);d.position.set(420,1.5,348);d.castShadow=d.receiveShadow=true;scene3.add(d);
    const e=new THREE.Mesh(new THREE.BoxGeometry(48,3,12),m);e.position.set(420,1.5,376);e.castShadow=e.receiveShadow=true;scene3.add(e);
    [[-20,382],[20,382],[-7,330],[7,330]].forEach(([dx,z])=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,8,6),lam({color:'#7A4D2B'}));p.position.set(420+dx,2,z);scene3.add(p)})}
  function lamp(x,z){const g=new THREE.Group(),p=new THREE.Mesh(new THREE.CylinderGeometry(1,1.3,24,6),lam({color:'#3a3550'}));p.position.y=12;g.add(p);
    const h=new THREE.Mesh(new THREE.BoxGeometry(6,5,6),lam({color:'#3a3550'}));h.position.y=25;g.add(h);
    const bulb=new THREE.Mesh(new THREE.BoxGeometry(4,3.5,4),new THREE.MeshLambertMaterial({color:'#d9d4e6',emissive:'#ffe27a',emissiveIntensity:0}));bulb.position.y=22.5;g.add(bulb);
    const L=new THREE.PointLight('#ffd27a',0,90,1.6);L.position.y=21;g.add(L);
    g.traverse(o=>{if(o.isMesh)o.castShadow=true});g.position.set(x,0,z);scene3.add(g);lamps.push({bulb,L})}

  // ---------- 角色立牌 ----------
  function sprTex(k,flip){const key=k+(flip?'f':'');if(spr[key])return spr[key];const im=SPR[k];if(!im||!im.complete||!im.naturalWidth)return null;
    const t=new THREE.Texture(im);t.needsUpdate=true;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;
    if(flip){t.wrapS=THREE.RepeatWrapping;t.repeat.x=-1;t.offset.x=1}return spr[key]=t}
  const blob=new THREE.CircleGeometry(1,16),blobM=new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:0.22,depthWrite:false});
  function actor(o){
    if(!o.s3){const m=new THREE.SpriteMaterial({alphaTest:0.5});o.s3=new THREE.Sprite(m);o.s3.center.set(0.5,0);o.s3.userData.actor=o;scene3.add(o.s3);
      o.sh3=new THREE.Mesh(blob,blobM);o.sh3.rotation.x=-Math.PI/2;scene3.add(o.sh3)}
    return o.s3}
  function placeActor(o,k,tint){
    const s=actor(o),t=sprTex(k,o.dir<0);if(!t){s.visible=false;return}s.visible=true;
    if(s.material.map!==t){s.material.map=t;s.material.needsUpdate=true}
    const im=SPR[k],w=im.naturalWidth*UPX,h=im.naturalHeight*UPX,b=o.walk?Math.abs(Math.sin((townT+(o.x||0))*10))*1.4:0;
    s.scale.set(w,h,1);s.position.set(o.x,b,o.y);s.material.color.set(tint);
    o.sh3.position.set(o.x,0.25,o.y);o.sh3.scale.set(w*0.36,w*0.16,1);
  }

  // ---------- 时间：早上偏暖、17:00 起橘色黄昏、19:00 后天黑（亮窗户、点路灯） ----------
  const C3=(a)=>new THREE.Color(a);
  function lightFor(m){
    const night=m>=19*60,dusk=m>=17*60&&!night,morn=m<10*60,k=night?1:dusk?Math.min(1,(m-17*60)/90):0;
    sun.color.copy(C3('#fff3d6').lerp(C3(night?'#6f7fd0':'#ff9a5a'),night?1:k*0.8));sun.intensity=night?0.25:0.8-0.25*k-(morn?0.05:0);
    hemi.color.copy(C3('#e8f4ff').lerp(C3(night?'#3a3f8a':'#ffb48a'),night?1:k*0.7));hemi.intensity=night?0.45:0.55;
    const sky=night?'#141238':dusk?C3('#9fd8ff').lerp(C3('#ff9a6a'),k).getStyle():morn?'#bfe4ff':'#9fd8ff';scene3.background.set(sky);scene3.fog.color.set(sky);
    const lit=m>=17*60+30;winMats.forEach(w=>{w.m.emissiveIntensity=lit&&G.open[w.k]?0.9:0});
    lamps.forEach(l=>{l.bulb.material.emissiveIntensity=lit?1:0;l.L.intensity=night?1.4:lit?0.6:0});
    return night?'#8a90c8':dusk?C3('#ffffff').lerp(C3('#ffc6a0'),k).getStyle():'#ffffff';
  }

  // ---------- 镜头：斜 45 度往下看，跟着主角，不出地图 ----------
  function resize(){if(!R3||!(innerWidth>0&&innerHeight>0))return;R3.setPixelRatio(Math.min(2,window.devicePixelRatio||1));R3.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
  const PITCH=50*Math.PI/180;
  function camDist(){const vw=Math.max(420,Math.min(540,innerWidth*0.62)); // 一屏横着看到 300–420 个地图单位
    return vw/cam.aspect/2/Math.tan(cam.fov*Math.PI/360)}
  function placeCam(dt){
    const half=Math.max(150,Math.min(422,camDist()*Math.tan(cam.fov*Math.PI/360)*cam.aspect));
    const tx=Math.max(GX0+half+40,Math.min(GX0+GW-half-40,me.x)),tz=Math.max(150,Math.min(290,me.y-10));
    const k=dt>0?Math.min(1,dt*4):1;look.x+=(tx-look.x)*k;look.z+=(tz-look.z)*k;
    if(!isFinite(look.x)||!isFinite(look.z)){look.x=isFinite(tx)?tx:420;look.z=isFinite(tz)?tz:220}
    const d=camDist();cam.position.set(look.x,Math.sin(PITCH)*d,look.z+Math.cos(PITCH)*d);cam.lookAt(look.x,0,look.z);
  }

  // ---------- 每帧：走路、闲逛（和 2D 版一样的规则）、画 ----------
  function frame(dt){
    if(!ready)init();R3.domElement.style.display='block';
    if(JSON.stringify(G.open)!==openSig)houses(); // 解锁了新店：重盖房子
    townT+=dt;eveningClock(dt);
    const dx=me.tx-me.x,dy=me.ty-me.y,d=Math.hypot(dx,dy),sp=70*dt,walking=d>sp;
    me.walk=walking;if(walking){me.x+=dx/d*sp;me.y+=dy/d*sp;if(Math.abs(dx)>1)me.dir=Math.sign(dx)}
    else{me.x=me.tx;me.y=me.ty;if(me.goal){const g=me.goal;me.goal=null;enterShop(g)}}
    npcs.forEach(n=>{if(n.wait>0){n.wait-=dt;return}const ex=n.tx-n.x,ey=n.ty-n.y,e=Math.hypot(ex,ey),v=(n.spd||14)*dt;
      if(e>v){n.x+=ex/e*v;n.y+=ey/e*v;n.walk=true;if(Math.abs(ex)>1)n.dir=Math.sign(ex)}else{n.walk=false;n.wait=1+Math.random()*3;const q=n.spot();n.tx=q.x;n.ty=q.y}});
    const tint=lightFor(G.clock);
    npcs.forEach(n=>placeActor(n,n.kind||'redbaby',tint));placeActor(me,'needle',tint);
    if(falls)falls.offset.y=(falls.offset.y+dt*1.6)%1;if(pole)pole.offset.y=(pole.offset.y+dt*0.8)%1;
    if(heart)heart.material.opacity=Math.sin(townT*5)>-0.3?1:0.45;
    waves.forEach(w=>{w.position.x=w.userData.x0+Math.sin(townT*1.2+w.userData.ph)*6});
    placeCam(dt);R3.render(scene3,cam);labels();
  }
  function hide(){if(R3)R3.domElement.style.display='none'}
  // ---------- 2D 叠层：店名标签 + 该去哪里的小箭头 ----------
  const v3=()=>new THREE.Vector3();
  function scr(x,y,z){const v=v3().set(x,y,z).project(cam);return[(v.x+1)/2*innerWidth*DPR,(1-v.y)/2*innerHeight*DPR,v.z<1]}
  function labels(){
    const open=G.phase!=='night'&&G.sess<2,d=DPR;
    Object.entries(BLD).forEach(([k,b])=>{const [x,y,ok]=scr(b.x+b.w/2,WALL+ROOF+(k==='home'?36:8),b.front-b.d/2);if(!ok)return; // 店名挂在屋顶上方，不挡门口的角色
      if(!G.open[k])return tag(`${SHOPS[k].name} · 🔒${SHOPS[k].price}`,x,y,{fs:11});
      if(k==='home')return tag('主角家',x,y,{fs:11});
      tag(`${k==='biscuit'?'饼干店':SHOPS[k].name} · ${open?'营业中':'已打烊'}`,x,y,open?{bg:'#3E9A48',border:'#2B1B3D',c:'#FFFFFF',fs:11}:{fs:11})});
    {const [x,y]=scr(420,34,172);tag('公告板',x,y,{bg:'#FFD23F',border:'#2B1B3D',c:'#2B1B3D',fs:10})}
    {const [x,y]=scr(14,26,178);tag('出镇',x,y,{bg:'#8A5A34',border:'#2B1B3D',fs:10})}
    // 下一步去哪：白天还能营业 → 饼干店；晚上 → 回家
    const goal=G.phase==='night'?'home':G.sess<2?'biscuit':null,lift=goal==='home'?62:34;
    if(goal&&!DLG&&$('panel').classList.contains('hidden')){const b=BLD[goal],bob=Math.abs(Math.sin(townT*4))*6*d,W=innerWidth*d,H=innerHeight*d,m=30*d;
      let [x,y]=scr(b.x+b.w/2,WALL+ROOF+lift,b.front-b.d/2);x=Math.max(m,Math.min(W-m,x));y=Math.max(m+40*d,Math.min(H-m,y)); // 不在屏幕里就贴着屏幕边
      ctx.fillStyle='#2B1B3D';ctx.beginPath();ctx.moveTo(x-11*d,y-16*d-bob);ctx.lineTo(x+11*d,y-16*d-bob);ctx.lineTo(x,y-bob);ctx.fill();
      ctx.fillStyle='#FFD23F';ctx.beginPath();ctx.moveTo(x-7*d,y-13.5*d-bob);ctx.lineTo(x+7*d,y-13.5*d-bob);ctx.lineTo(x,y-4*d-bob);ctx.fill()}
  }
  // ---------- 点屏幕：角色 → 聊天；房子 / 公告板 / 路口 → 走过去；地面 → 走到那里 ----------
  function tap(cx,cy){
    if(!ready)return;
    rayc.setFromCamera({x:cx/innerWidth*2-1,y:-(cy/innerHeight)*2+1},cam);rayc.camera=cam;
    const sprites=npcs.filter(n=>n.s3&&n.s3.visible).map(n=>n.s3),hs=rayc.intersectObjects(sprites,false);
    if(hs.length){const n=hs[0].object.userData.actor;me.tx=n.x+(me.x<n.x?-14:14);me.ty=n.y;me.goal=null;n.wait=4;return chat(n)}
    const h=rayc.intersectObjects(pickables,true)[0];if(!h)return;let o=h.object;
    const k=o.userData.k,goal=o.userData.goal;
    if(k){const b=BLD[k];me.tx=b.x+b.w/2;me.ty=b.front+22;me.goal=k;return} // 立牌是斜着朝镜头的，站太近会插进墙里
    if(goal==='board'){me.tx=420;me.ty=184;me.goal='board';return}
    if(goal==='exit'){me.tx=20;me.ty=196;me.goal='exit';return}
    const p=h.point;me.tx=Math.max(-20,Math.min(880,p.x));me.ty=Math.max(64,Math.min(334,p.z));me.goal=null;
  }
  // 小镇布局：房子门口、NPC 闲逛范围用地图单位（NPCConfig 的 WanderRect 原样用）
  function layout(){
    init();
    MAP={map:true,d3:true,kx:1,ky:1,X:x=>x,Y:y=>y,x:0,y:0,w:844,h:390};HL=null;
    B=Object.entries(BLD).map(([k,b])=>({k,x:b.x+b.w/2,y:b.front,w:b.w,h:WALL+ROOF}));streets=[];deco=[];
    if(!npcs.length||!npcs[0].z3){npcs.forEach(n=>{if(n.s3){scene3&&scene3.remove(n.s3,n.sh3)}});
      npcs=MP.zones.map(([kind,zx,zy,zw,zh,spd])=>{const spot=()=>({x:zx+8+Math.random()*(zw-16),y:zy+14+Math.random()*(zh-16)}),p=spot(),q=spot();
        return{x:p.x,y:p.y,tx:q.x,ty:q.y,wait:Math.random()*3,spot,kind,spd,z3:true}})}
    if(!me.goal&&!me.p3){const b=BLD.home;me.x=me.tx=b.x+b.w/2;me.y=me.ty=186;me.p3=true}
    resize();placeCam(0);
  }
  return{frame,hide,tap,layout,resize,init,_dbg:()=>({cam,look})};
})();
