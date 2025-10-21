// Archimedes Spiral — PWA (GitHub Pages Optimized + Quality/Gradient/Recording + Auto Demo)
(function(){
  'use strict';

  // --- Install prompt ---
  let deferredPrompt;
  const btnInstall = document.getElementById('btnInstall');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if(btnInstall) btnInstall.style.display = 'inline-flex';
  });
  btnInstall?.addEventListener('click', async () => {
    try{ await deferredPrompt?.prompt(); }catch(_){}
    deferredPrompt = null;
    btnInstall.style.display = 'none';
  });

  // --- SW (robust path for GH Pages subfolder) ---
  if ('serviceWorker' in navigator) {
    try{
      const swPath = (location.pathname.endsWith('/') ? location.pathname : location.pathname.replace(/[^/]+$/,'')) + 'sw.js';
      navigator.serviceWorker.register(swPath);
    }catch(e){}
  }

  const $ = (s) => document.querySelector(s);
  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d');

  // Controls
  const ctrl = {
    a: $('#a'), aNum: $('#aNum'),
    b: $('#b'), bNum: $('#bNum'),
    turns: $('#turns'), turnsNum: $('#turnsNum'),
    tStep: $('#tStep'), tStepNum: $('#tStepNum'),
    scale: $('#scale'), scaleNum: $('#scaleNum'),
    rot: $('#rot'), rotNum: $('#rotNum'),
    lineColor: $('#lineColor'),
    lineW: $('#lineW'),
    asPoints: $('#asPoints'),
    scanlines: $('#scanlines'),
    animate: $('#animate'),
    btnReset: $('#btnReset'),
    // Preset/export existing buttons kept by previous build
    // 3D
    mode3d: $('#mode3d'),
    zPerTurn: $('#zPerTurn'), zPerTurnNum: $('#zPerTurnNum'),
    fov: $('#fov'), fovNum: $('#fovNum'),
    rxSpeed: $('#rxSpeed'), rxSpeedNum: $('#rxSpeedNum'),
    rySpeed: $('#rySpeed'), rySpeedNum: $('#rySpeedNum'),
    rzSpeed: $('#rzSpeed'), rzSpeedNum: $('#rzSpeedNum'),
    // New
    quality: $('#quality'),
    gradientMode: $('#gradientMode'),
    autoDemo: $('#autoDemo'),
    btnRecordWebM: $('#btnRecordWebM'),
    btnStopRecord: $('#btnStopRecord'),
    btnFramesZip: $('#btnFramesZip')
  };

  // Sync helpers
  function linkRangeNumber(range, number, onChange){
    function syncToNum(){ number.value = range.value; onChange?.(); }
    function syncToRange(){ range.value = number.value; onChange?.(); }
    range?.addEventListener('input', syncToNum);
    number?.addEventListener('input', syncToRange);
  }

  // Geometry cache
  let pts2D = [];   // base (x,y) before canvas transforms
  let pts3D = [];   // base (x,y,z) object space
  let MAX_POINTS = 20000;

  function recomputeMaxPoints(){
    const q = ctrl.quality?.value || 'med';
    MAX_POINTS = q === 'low' ? 6000 : q === 'high' ? 40000 : 20000;
  }

  function computeGeometry(){
    recomputeMaxPoints();
    const a = parseFloat(ctrl.a.value);
    const b = parseFloat(ctrl.b.value);
    const turns = parseInt(ctrl.turns.value, 10);
    const tStep = parseFloat(ctrl.tStep.value);
    const tMax = turns * Math.PI * 2;
    const effStep = Math.max(tStep, tMax / MAX_POINTS);

    // 2D
    const p2 = [];
    for(let t=0; t<=tMax; t+=effStep){
      const r = a + b * t;
      p2.push({x: r*Math.cos(t), y: -r*Math.sin(t), t, r});
    }
    pts2D = p2;

    // 3D
    const zPerTurn = parseFloat(ctrl.zPerTurn?.value || 120);
    const p3 = [];
    for(let t=0; t<=tMax; t+=effStep){
      const r = a + b * t;
      const x = r*Math.cos(t);
      const y = -r*Math.sin(t);
      const z = (zPerTurn * t) / (Math.PI*2);
      p3.push({x, y, z, t, r});
    }
    pts3D = p3;
  }

  // Recompute on parameter changes that affect geometry
  function markDirty(){ computeGeometry(); draw(); }

  ;[
    [ctrl.a, ctrl.aNum],
    [ctrl.b, ctrl.bNum],
    [ctrl.turns, ctrl.turnsNum],
    [ctrl.tStep, ctrl.tStepNum],
    [ctrl.zPerTurn, ctrl.zPerTurnNum]
  ].forEach(([r,n])=> linkRangeNumber(r, n, markDirty));

  // Other controls just redraw
  ;[
    [ctrl.scale, ctrl.scaleNum],
    [ctrl.rot, ctrl.rotNum],
    [ctrl.fov, ctrl.fovNum],
    [ctrl.rxSpeed, ctrl.rxSpeedNum],
    [ctrl.rySpeed, ctrl.rySpeedNum],
    [ctrl.rzSpeed, ctrl.rzSpeedNum]
  ].forEach(([r,n])=> linkRangeNumber(r, n, draw));

  ['lineColor','lineW','asPoints','scanlines','mode3d','quality','gradientMode'].forEach(id=>{
    ctrl[id]?.addEventListener('input', draw);
  });

  ctrl.btnReset?.addEventListener('click', () => {
    ctrl.a.value = ctrl.aNum.value = 0;
    ctrl.b.value = ctrl.bNum.value = 6;
    ctrl.turns.value = ctrl.turnsNum.value = 10;
    ctrl.tStep.value = ctrl.tStepNum.value = 0.01;
    ctrl.scale.value = ctrl.scaleNum.value = 1;
    ctrl.rot.value = ctrl.rotNum.value = 0;
    ctrl.lineColor.value = '#2dd4bf';
    ctrl.lineW.value = 2;
    ctrl.asPoints.checked = false;
    ctrl.scanlines.checked = false;
    ctrl.mode3d.checked = false;
    ctrl.zPerTurn.value = ctrl.zPerTurnNum.value = 120;
    ctrl.fov.value = ctrl.fovNum.value = 700;
    ctrl.rxSpeed.value = ctrl.rxSpeedNum.value = 0;
    ctrl.rySpeed.value = ctrl.rySpeedNum.value = 18;
    ctrl.rzSpeed.value = ctrl.rzSpeedNum.value = 0;
    ctrl.quality.value = 'med';
    ctrl.gradientMode.value = 'none';
    ctrl.autoDemo.checked = false;
    computeGeometry(); draw();
  });

  // Resize
  function resize(){
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  window.addEventListener('resize', resize);

  // 3D helpers
  let rotX = 0, rotY = 0, rotZ = 0;
  function rotateXYZ(x, y, z, ax, ay, az){
    // X
    let c = Math.cos(ax), s = Math.sin(ax);
    let y1 = y * c - z * s;
    let z1 = y * s + z * c;
    // Y
    c = Math.cos(ay); s = Math.sin(ay);
    let x2 = x * c + z1 * s;
    let z2 = -x * s + z1 * c;
    // Z
    c = Math.cos(az); s = Math.sin(az);
    let x3 = x2 * c - y1 * s;
    let y3 = x2 * s + y1 * c;
    return {x:x3, y:y3, z:z2};
  }
  function project3D(x, y, z, fov, w, h){
    const dz = z + fov; // keep > 0
    const px = (x * fov) / dz;
    const py = (y * fov) / dz;
    return {x: px + w/2, y: py + h/2, depth: dz};
  }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function hexToRgb(hex){
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if(!m) return {r:255,g:255,b:255};
    return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)};
  }
  function rgbToCss(r,g,b,a=1){ return `rgba(${r|0},${g|0},${b|0},${a})`; }

  // Drawing
  function draw2D(w, h){
    const scale = parseFloat(ctrl.scale.value);
    const rot = parseFloat(ctrl.rot.value) * Math.PI/180;
    const baseColor = ctrl.lineColor.value;
    const lw = parseInt(ctrl.lineW.value, 10);
    const gradMode = ctrl.gradientMode?.value || 'none';
    const asPts = ctrl.asPoints.checked;
    const drawScan = ctrl.scanlines.checked && !ctrl.animate.checked; // skip in animation

    const rgb = hexToRgb(baseColor);
    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.lineWidth = lw;

    if (!asPts) ctx.beginPath();
    const n = pts2D.length;
    const maxR = Math.max(1, pts2D.length ? Math.max(...pts2D.map(p=>Math.hypot(p.x,p.y))) : 1);

    for(let i=0; i<n; i++){
      const p = pts2D[i];
      const x = p.x, y = p.y;

      // color/gradient
      let color = baseColor, alpha = 1;
      if (gradMode === 'radius'){
        const t = Math.hypot(x,y)/maxR;
        const r = lerp(rgb.r, 234, t), g = lerp(rgb.g, 241, t), b = lerp(rgb.b, 255, t);
        color = rgbToCss(r,g,b,1);
      }

      if (asPts){
        ctx.fillStyle = color;
        ctx.fillRect(x, y, Math.max(1, lw), Math.max(1, lw));
      } else {
        ctx.strokeStyle = color;
        if (i===0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      if (drawScan){
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x, h/8 + 205);
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
    if (!asPts){
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw3D(w, h){
    const scale = parseFloat(ctrl.scale.value);
    const uiRotZ = parseFloat(ctrl.rot.value) * Math.PI/180;
    const fov = parseFloat(ctrl.fov.value);
    const baseColor = ctrl.lineColor.value;
    const lw = parseInt(ctrl.lineW.value, 10);
    const gradMode = ctrl.gradientMode?.value || 'none';
    const asPts = ctrl.asPoints.checked;

    const ax = rotX * Math.PI/180;
    const ay = rotY * Math.PI/180;
    const az = rotZ * Math.PI/180 + uiRotZ;

    const rgb = hexToRgb(baseColor);
    const n = pts3D.length;
    const maxR = Math.max(1, pts3D.length ? Math.max(...pts3D.map(p=>p.r)) : 1);

    let prev = null;
    for(let i=0; i<n; i++){
      const b = pts3D[i];
      const x0 = b.x * scale, y0 = b.y * scale, z0 = b.z * scale;
      const v = rotateXYZ(x0, y0, z0, ax, ay, az);
      const p = project3D(v.x, v.y, v.z, fov, w, h);

      // gradient/alpha by depth or radius
      let color = baseColor, alpha = 1;
      if (gradMode === 'depth'){
        alpha = Math.max(0.25, Math.min(1.0, 1.2 - (p.depth / (fov*2))));
        color = rgbToCss(rgb.r, rgb.g, rgb.b, alpha);
      } else if (gradMode === 'radius'){
        const t = b.r / maxR;
        const r = lerp(rgb.r, 234, t), g = lerp(rgb.g, 241, t), bcol = lerp(rgb.b, 255, t);
        color = rgbToCss(r,g,bcol,1);
      }

      if (asPts){
        ctx.fillStyle = color;
        ctx.fillRect(p.x, p.y, Math.max(1, lw), Math.max(1, lw));
      } else if (prev){
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      prev = p;
    }
    ctx.globalAlpha = 1;
  }

  function draw(){
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);
    if (ctrl.mode3d?.checked){
      draw3D(w, h);
    } else {
      draw2D(w, h);
    }
  }

  // Animation (time-based)
  let animId = null;
  let last = performance.now();
  function tick(now){
    if (!ctrl.animate.checked){ animId = null; return; }
    const dt = (now - last) / 1000;
    last = now;

    if (ctrl.mode3d.checked){
      const sx = parseFloat(ctrl.rxSpeed.value) || 0;
      const sy = parseFloat(ctrl.rySpeed.value) || 0;
      const sz = parseFloat(ctrl.rzSpeed.value) || 0;
      rotX = (rotX + sx * dt) % 360;
      rotY = (rotY + sy * dt) % 360;
      rotZ = (rotZ + sz * dt) % 360;
    } else {
      // 2D: animate global rotation
      const r = (parseFloat(ctrl.rot.value) + 20 * dt) % 360;
      ctrl.rot.value = ctrl.rotNum.value = r.toFixed(1);
    }

    draw();
    animId = requestAnimationFrame(tick);
  }

  ctrl.animate?.addEventListener('change', () => {
    if (ctrl.animate.checked && !animId){
      last = performance.now();
      animId = requestAnimationFrame(tick);
    } else if (!ctrl.animate.checked){
      draw(); // ensure full quality when stopped
    }
  });

  // --- Recording (WebM via MediaRecorder) ---
  let mediaRecorder = null;
  let recordedChunks = [];

  function startWebM(){
    if (!('MediaRecorder' in window)) { alert('MediaRecorder non supportato da questo browser'); return; }
    const stream = canvas.captureStream(60); // 60 fps
    const opts = { mimeType: 'video/webm;codecs=vp9' };
    try{
      mediaRecorder = new MediaRecorder(stream, opts);
    }catch(e){
      try{ mediaRecorder = new MediaRecorder(stream, {mimeType:'video/webm'}); }catch(err){
        alert('Registrazione non supportata: ' + err); return;
      }
    }
    recordedChunks = [];
    mediaRecorder.ondataavailable = (e)=>{ if (e.data.size>0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = ()=>{
      const blob = new Blob(recordedChunks, {type: mediaRecorder.mimeType || 'video/webm'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'archimedes_spiral.webm';
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 500);
      ctrl.btnStopRecord.disabled = true;
      ctrl.btnRecordWebM.disabled = false;
    };
    mediaRecorder.start();
    ctrl.btnStopRecord.disabled = false;
    ctrl.btnRecordWebM.disabled = true;
    // ensure animation running
    if (!ctrl.animate.checked){ ctrl.animate.checked = true; last = performance.now(); animId = requestAnimationFrame(tick); }
  }

  function stopWebM(){
    mediaRecorder?.stop();
  }

  ctrl.btnRecordWebM?.addEventListener('click', startWebM);
  ctrl.btnStopRecord?.addEventListener('click', stopWebM);

  // --- PNG frames ZIP (fallback for GIF via strumenti esterni) ---
  ctrl.btnFramesZip?.addEventListener('click', async ()=>{
    // Record ~5s @ 30fps => 150 frames
    const frames = 150, fps = 30;
    const delay = 1000/fps;
    const images = [];
    // ensure animation on
    const prevAnim = ctrl.animate.checked;
    if (!prevAnim){ ctrl.animate.checked = true; last = performance.now(); animId = requestAnimationFrame(tick); }

    for(let i=0;i<frames;i++){
      await new Promise(r=>setTimeout(r, delay));
      images.push(canvas.toDataURL('image/png'));
    }
    if (!prevAnim){ ctrl.animate.checked = false; }

    // Build a client-side zip (minimal)
    // NOTE: Without external libs we cannot zip reliably here;
    // user can download frames individually in a new tab sequence as fallback.
    images.forEach((data,i)=>{
      const a = document.createElement('a');
      a.href = data; a.download = `frame_${String(i).padStart(3,'0')}.png`;
      a.click();
    });
    alert('Frame PNG salvati (uno per volta). Usa un tool esterno per creare una GIF.');
  });

  // Init
  function initDefaults(){
    ctrl.quality.value = ctrl.quality?.value || 'med';
    ctrl.gradientMode.value = ctrl.gradientMode?.value || 'none';
  }
  function resizeAndCompute(){
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    computeGeometry();
  }

  window.addEventListener('resize', ()=>{ resizeAndCompute(); draw(); });

  initDefaults();
  resizeAndCompute();
  draw();

  // Auto demo (screensaver-style) if enabled
  if (ctrl.autoDemo?.checked){
    ctrl.mode3d.checked = true;
    ctrl.animate.checked = true;
    ctrl.rxSpeed.value = ctrl.rxSpeedNum.value = 8;
    ctrl.rySpeed.value = ctrl.rySpeedNum.value = 18;
    ctrl.rzSpeed.value = ctrl.rzSpeedNum.value = 0;
    last = performance.now();
    animId = requestAnimationFrame(tick);
  }
})();