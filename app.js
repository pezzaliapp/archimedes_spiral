
(function(){
  'use strict';
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);

  const mode = $('mode'), turns = $('turns'), bEl = $('b'), lw = $('lw'),
        color = $('color'), points = $('points'), animate = $('animate'),
        zpt = $('zpt'), fovEl = $('fov'), ry = $('ry'),
        quality = $('quality'), btnAutoQuality = $('btnAutoQuality'),
        gradientMode = $('gradientMode');
  const only3d = Array.from(document.querySelectorAll('.only3d'));

  function resize(){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.max(1, Math.floor(w * dpr));
    cv.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', ()=>{ resize(); compute(); draw(0); });

  // Geometry
  let P2 = [], P3 = [];
  function compute(){
    const b = parseFloat(bEl.value);
    const tMax = parseInt(turns.value,10) * Math.PI * 2;
    const MAX = quality.value==='low'?6000:(quality.value==='high'?24000:12000);
    const step = Math.max(0.003, tMax / MAX);
    P2 = []; P3 = [];
    for(let t=0; t<=tMax; t+=step){
      const r = b * t;
      const x = r*Math.cos(t), y = -r*Math.sin(t);
      P2.push({x,y,r,t});
      const z = (parseFloat(zpt.value) * t)/(Math.PI*2);
      P3.push({x,y,z,r,t});
    }
  }

  function project3D(x,y,z,fov,w,h){
    const dz = z + fov; const px = (x*fov)/dz, py = (y*fov)/dz;
    return {x:px + w/2, y:py + h/2, d:dz};
  }
  
  function hexToRgb(hex){ const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:{r:255,g:255,b:255}; }
  function rgbToCss(r,g,b,a=1){ return `rgba(${r|0},${g|0},${b|0},${a})`; }
  function mixTowardLight(rgb, t){ const lr=234, lg=241, lb=255; return {r: rgb.r + (lr-rgb.r)*t, g: rgb.g + (lg-rgb.g)*t, b: rgb.b + (lb-rgb.b)*t}; }

  function rotateY(x,y,z,ang){
    const c=Math.cos(ang), s=Math.sin(ang);
    return {x: x*c + z*s, y, z: -x*s + z*c};
  }

  function draw(t){
    const w = cv.width/(window.devicePixelRatio||1);
    const h = cv.height/(window.devicePixelRatio||1);
    ctx.clearRect(0,0,w,h);
    ctx.lineWidth = Math.max(1, parseInt(lw.value,10));
    const asPts = !!points.checked;
    const col = color.value;
    const grad = gradientMode ? gradientMode.value : 'none';
    const base = hexToRgb(col);

    if (mode.value === '2d'){
      const rot = t*0.6;
      ctx.save(); ctx.translate(w/2, h/2); ctx.rotate(rot);
      ctx.strokeStyle = col; ctx.fillStyle = col;
    const N3 = P3.length;
      if (!asPts) ctx.beginPath();
      const N = P2.length; const maxR = Math.max(1, N ? Math.max(...P2.map(p=>Math.hypot(p.x,p.y))) : 1);
      for(let i=0;i<P2.length;i++){
        const p = P2[i]; if (asPts) ctx.fillRect(p.x,p.y,ctx.lineWidth,ctx.lineWidth);
        else (i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
      }
      if (!asPts) ctx.stroke();
      ctx.restore(); return;
    }

    const fov = parseFloat(fovEl.value);
    const angY = (t * (parseFloat(ry.value)*Math.PI/180));
    let prev = null;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    const N3 = P3.length;
    for(let i=0;i<P3.length;i++){
      const b = P3[i];
      const rY = rotateY(b.x, b.y, b.z, angY);
      const p = project3D(rY.x, rY.y, rY.z, fov, w, h);
      if (asPts) ctx.fillRect(p.x, p.y, ctx.lineWidth, ctx.lineWidth);
      else if (prev){ ctx.beginPath(); ctx.moveTo(prev.x,prev.y); ctx.lineTo(p.x,p.y); ctx.stroke(); }
      prev = p;
    }
  }

  function sync3dUI(){ const is3d = mode.value === '3d'; only3d.forEach(el => el.style.display = is3d ? '' : 'none'); }
  [mode,turns,bEl,lw,color,points,animate,zpt,fovEl,ry,quality,gradientMode].forEach(el=> el.addEventListener('input', ()=>{ sync3dUI(); compute(); }));

  // Restart animation when toggled ON
  animate.addEventListener('change', ()=>{ if (animate.checked) { startTime = performance.now(); requestAnimationFrame(tick); } else { draw(0); } });

  // Auto Quality test (~1s)
  function autoQuality(){
    const testDuration = 1000; let frames = 0;
    const prev = animate.checked; animate.checked = true;
    const start = performance.now();
    function testTick(now){
      frames++; draw((now - start)/1000);
      if (now - start < testDuration){ requestAnimationFrame(testTick); }
      else {
        const fps = frames * 1000 / (now - start);
        let level = 'med'; if (fps>=55) level='high'; else if (fps>=28) level='med'; else level='low';
        quality.value = level; compute(); draw(0);
        if (!prev) animate.checked = false;
        alert('FPS stimato: ' + fps.toFixed(0) + ' → Qualità: ' + (level=='high'?'Alta':level=='med'?'Media':'Bassa'));
      }
    }
    requestAnimationFrame(testTick);
  }
  btnAutoQuality.addEventListener('click', autoQuality);

  // Loop
  function tick(now){ if (!animate.checked){ draw(0); return; } const t=(now-startTime)/1000; draw(t); requestAnimationFrame(tick); }
  let startTime = performance.now();

  // Init
  sync3dUI(); resize(); compute(); startTime = performance.now(); requestAnimationFrame(tick);
})();