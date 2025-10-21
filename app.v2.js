
(function(){
  'use strict';
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);

  const mode = $('mode'), turns = $('turns'), bEl = $('b'), lw = $('lw'),
        color = $('color'), points = $('points'), animate = $('animate'),
        zpt = $('zpt'), fovEl = $('fov'), ry = $('ry');
  const only3d = Array.from(document.querySelectorAll('.only3d'));

  // Resize
  function resize(){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.max(1, Math.floor(w * dpr));
    cv.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', ()=>{ resize(); compute(); draw(0); });

  // Geometry cache
  let P2 = [], P3 = [];
  function compute(){
    const b = parseFloat(bEl.value);
    const tMax = parseInt(turns.value,10) * Math.PI * 2;
    const MAX = (quality?.value==='low'?6000:(quality?.value==='high'?24000:12000));
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
    const dz = z + fov;
    const px = (x*fov)/dz, py = (y*fov)/dz;
    return {x:px + w/2, y:py + h/2, d:dz};
  }
  function rotateY(x,y,z,ang){
    const c=Math.cos(ang), s=Math.sin(ang);
    return {x: x*c + z*s, y, z: -x*s + z*c};
  }

  // Draw
  function draw(t){
    const w = cv.width/(window.devicePixelRatio||1);
    const h = cv.height/(window.devicePixelRatio||1);
    ctx.clearRect(0,0,w,h);

    ctx.lineWidth = Math.max(1, parseInt(lw.value,10));
    const asPts = !!points.checked;
    const col = color.value;

    if (mode.value === '2d'){
      // rotate slowly over time
      const rot = t*0.6; // rad/s
      ctx.save();
      ctx.translate(w/2, h/2);
      ctx.rotate(rot);
      ctx.strokeStyle = col; ctx.fillStyle = col;

      if (!asPts) ctx.beginPath();
      for(let i=0;i<P2.length;i++){
        const p = P2[i];
        const x = p.x, y = p.y;
        if (asPts) ctx.fillRect(x,y,ctx.lineWidth,ctx.lineWidth);
        else (i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));
      }
      if (!asPts) ctx.stroke();
      ctx.restore();
      return;
    }

    // 3D
    const fov = parseFloat(fovEl.value);
    const angY = (t * (parseFloat(ry.value)*Math.PI/180));
    let prev = null;
    ctx.strokeStyle = col; ctx.fillStyle = col;

    for(let i=0;i<P3.length;i++){
      const b = P3[i];
      const rY = rotateY(b.x, b.y, b.z, angY);
      const p = project3D(rY.x, rY.y, rY.z, fov, w, h);
      if (asPts){
        ctx.fillRect(p.x, p.y, ctx.lineWidth, ctx.lineWidth);
      } else if (prev){
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      prev = p;
    }
  }

  // UI
  function sync3dUI(){
    const is3d = mode.value === '3d';
    only3d.forEach(el => el.style.display = is3d ? '' : 'none');
  }
  [mode,turns,bEl,lw,color,points,animate,zpt,fovEl,ry].forEach(el=>{
    el.addEventListener('input', ()=>{ sync3dUI(); compute(); });
  });
  quality?.addEventListener('input', ()=>{ compute(); });
  btnAutoQuality?.addEventListener('click', autoQuality);

  // Anim loop
  let last = performance.now();
  function tick(now){
    if (!animate.checked) { draw(0); return; }
    const t = (now - startTime)/1000;
    draw(t);
    requestAnimationFrame(tick);
  }
  let startTime = performance.now();

  // Service Worker register (GH Pages safe)
  if ('serviceWorker' in navigator) {
    try{
      const swPath = (location.pathname.endsWith('/') ? location.pathname : location.pathname.replace(/[^/]+$/,'')) + 'sw.js';
      navigator.serviceWorker.register(swPath);
    }catch(e){ console.warn('SW register failed', e); }
  }

  
  function autoQuality(){
    const testDuration = 1000; // ms
    let frames = 0;
    const prev = animate.checked;
    // ensure animation is running for the test
    animate.checked = true;
    let start = performance.now();
    function testTick(now){
      frames++;
      // force some rotation so there's motion
      const rotY = document.getElementById('ry');
      rotY.value = parseFloat(rotY.value||'20') + 0.5;
      draw((now - start)/1000);
      if (now - start < testDuration){
        requestAnimationFrame(testTick);
      } else {
        const fps = frames * 1000 / (now - start);
        let level = 'med';
        if (fps >= 55) level = 'high';
        else if (fps >= 28) level = 'med';
        else level = 'low';
        quality.value = level;
        compute();
        draw(0);
        if (!prev) animate.checked = false;
        alert('FPS stimato: ' + fps.toFixed(0) + ' → Qualità: ' + (level=='high'?'Alta':level=='med'?'Media':'Bassa'));
      }
    }
    requestAnimationFrame(testTick);
  }

  // Init
  sync3dUI();
  resize();
  compute();
  startTime = performance.now();
  requestAnimationFrame(tick);

  // ===== Preset Manager (no gradients/recorders) =====
  const PRESETS_KEY = 'spiral_core_presets_v1';
  const defaultPresets = {
    "Classico": {mode:"2d", turns:12, b:6, lw:2, color:"#2dd4bf", points:false, animate:true, zpt:140, fov:700, ry:20},
    "Punti": {mode:"2d", turns:16, b:4, lw:2, color:"#eaf1ff", points:true, animate:true, zpt:140, fov:700, ry:20},
    "Demo Show": {mode:"3d", turns:14, b:6, lw:2, color:"#2dd4bf", points:false, animate:true, zpt:160, fov:740, ry:18}
  };
  function loadPresets(){
    try{
      const raw = localStorage.getItem(PRESETS_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      for (const k in defaultPresets){ if (!(k in obj)) obj[k] = defaultPresets[k]; }
      localStorage.setItem(PRESETS_KEY, JSON.stringify(obj));
      return obj;
    }catch(e){ return {...defaultPresets}; }
  }
  function savePresets(obj){
    localStorage.setItem(PRESETS_KEY, JSON.stringify(obj));
  }
  function refreshPresetSelect(selected){
    if (!presetSelect) return;
    const all = loadPresets();
    presetSelect.innerHTML = '';
    Object.keys(all).sort().forEach(name=>{
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      if (selected && selected === name) opt.selected = true;
      presetSelect.appendChild(opt);
    });
  }
  function getControls(){
    return {
      mode: document.getElementById('mode')?.value || '2d',
      turns: parseInt(document.getElementById('turns')?.value||'12',10),
      b: parseFloat(document.getElementById('b')?.value||'6'),
      lw: parseInt(document.getElementById('lw')?.value||'2',10),
      color: document.getElementById('color')?.value || '#2dd4bf',
      points: !!document.getElementById('points')?.checked,
      animate: !!document.getElementById('animate')?.checked,
      zpt: parseFloat(document.getElementById('zpt')?.value||'140'),
      fov: parseFloat(document.getElementById('fov')?.value||'700'),
      ry: parseFloat(document.getElementById('ry')?.value||'20')
    };
  }
  function applyControls(p){
    const set = (id,v)=>{ const el = document.getElementById(id); if(!el) return; if(el.type==='checkbox') el.checked=!!v; else el.value=v; el.dispatchEvent(new Event('input')); };
    set('mode', p.mode);
    set('turns', p.turns);
    set('b', p.b);
    set('lw', p.lw);
    set('color', p.color);
    set('points', p.points);
    set('animate', p.animate);
    set('zpt', p.zpt);
    set('fov', p.fov);
    set('ry', p.ry);
  }

  refreshPresetSelect('Demo Show');

  presetSelect?.addEventListener('change', ()=>{
    const all = loadPresets();
    const name = presetSelect.value;
    if (all[name]) applyControls(all[name]);
  });
  btnSavePreset?.addEventListener('click', ()=>{
    const name = (presetName?.value || '').trim();
    if (!name){ alert('Inserisci un nome preset'); return; }
    const all = loadPresets();
    all[name] = getControls();
    savePresets(all);
    refreshPresetSelect(name);
    presetName.value='';
  });
  btnDeletePreset?.addEventListener('click', ()=>{
    const name = presetSelect?.value;
    if (!name) return;
    const base = loadPresets();
    if (name in defaultPresets){ alert('Non puoi eliminare un preset di default'); return; }
    delete base[name];
    savePresets(base);
    refreshPresetSelect();
  });
  btnDemoShow?.addEventListener('click', ()=>{
    applyControls(defaultPresets["Demo Show"]);
  });

})();

// Build tag
console.log('Spiral build:', 'preset+quality r2');
