// Archimedes Spiral — PWA (GitHub Pages Optimized)
// - Precompute points (2D/3D) on param changes
// - Adaptive sampling (<= 20k points)
// - Time-based animation
// - Skip heavy scanlines while animating
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
    // 3D
    mode3d: $('#mode3d'),
    zPerTurn: $('#zPerTurn'), zPerTurnNum: $('#zPerTurnNum'),
    fov: $('#fov'), fovNum: $('#fovNum'),
    rxSpeed: $('#rxSpeed'), rxSpeedNum: $('#rxSpeedNum'),
    rySpeed: $('#rySpeed'), rySpeedNum: $('#rySpeedNum'),
    rzSpeed: $('#rzSpeed'), rzSpeedNum: $('#rzSpeedNum')
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
  const MAX_POINTS = 20000;

  function computeGeometry(){
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
      p2.push({x: r*Math.cos(t), y: -r*Math.sin(t)});
    }
    pts2D = p2;

    // 3D (uses zPerTurn)
    const zPerTurn = parseFloat(ctrl.zPerTurn?.value || 120);
    const p3 = [];
    for(let t=0; t<=tMax; t+=effStep){
      const r = a + b * t;
      const x = r*Math.cos(t);
      const y = -r*Math.sin(t);
      const z = (zPerTurn * t) / (Math.PI*2);
      p3.push({x, y, z});
    }
    pts3D = p3;
  }

  // Recompute on parameter changes that affect geometry
  function markDirty(){ computeGeometry(); draw(); }

  linkRangeNumber(ctrl.a, ctrl.aNum, markDirty);
  linkRangeNumber(ctrl.b, ctrl.bNum, markDirty);
  linkRangeNumber(ctrl.turns, ctrl.turnsNum, markDirty);
  linkRangeNumber(ctrl.tStep, ctrl.tStepNum, markDirty);
  linkRangeNumber(ctrl.zPerTurn, ctrl.zPerTurnNum, markDirty);

  // Other controls just redraw
  linkRangeNumber(ctrl.scale, ctrl.scaleNum, draw);
  linkRangeNumber(ctrl.rot, ctrl.rotNum, draw);
  linkRangeNumber(ctrl.fov, ctrl.fovNum, draw);
  linkRangeNumber(ctrl.rxSpeed, ctrl.rxSpeedNum, draw);
  linkRangeNumber(ctrl.rySpeed, ctrl.rySpeedNum, draw);
  linkRangeNumber(ctrl.rzSpeed, ctrl.rzSpeedNum, draw);

  ['lineColor','lineW','asPoints','scanlines','mode3d'].forEach(id=>{
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

  // Drawing
  function draw2D(w, h){
    const scale = parseFloat(ctrl.scale.value);
    const rot = parseFloat(ctrl.rot.value) * Math.PI/180;
    const color = ctrl.lineColor.value;
    const lw = parseInt(ctrl.lineW.value, 10);

    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;

    const asPts = ctrl.asPoints.checked;
    const drawScan = ctrl.scanlines.checked && !ctrl.animate.checked; // skip in animation

    if (!asPts) ctx.beginPath();
    for(let i=0; i<pts2D.length; i++){
      const p = pts2D[i];
      const x = p.x, y = p.y;
      if (asPts){
        ctx.fillRect(x, y, Math.max(1, lw), Math.max(1, lw));
      }else{
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
    if (!asPts) ctx.stroke();
    ctx.restore();
  }

  function draw3D(w, h){
    const scale = parseFloat(ctrl.scale.value);
    const uiRotZ = parseFloat(ctrl.rot.value) * Math.PI/180;
    const fov = parseFloat(ctrl.fov.value);
    const color = ctrl.lineColor.value;
    const lw = parseInt(ctrl.lineW.value, 10);

    const ax = rotX * Math.PI/180;
    const ay = rotY * Math.PI/180;
    const az = rotZ * Math.PI/180 + uiRotZ;

    const asPts = ctrl.asPoints.checked;

    let prev = null;
    for(let i=0; i<pts3D.length; i++){
      const b = pts3D[i];
      const x0 = b.x * scale, y0 = b.y * scale, z0 = b.z * scale;
      const v = rotateXYZ(x0, y0, z0, ax, ay, az);
      const p = project3D(v.x, v.y, v.z, fov, w, h);

      const shade = Math.max(0.25, Math.min(1.0, 1.2 - (p.depth / (fov*2))));
      ctx.globalAlpha = shade;
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
      draw(); // ensure scanlines appear again if enabled
    }
  });

  // Init
  function initDefaults(){
    ctrl.a.value = ctrl.aNum.value = ctrl.a?.value ?? 0;
    ctrl.b.value = ctrl.bNum.value = ctrl.b?.value ?? 6;
    ctrl.turns.value = ctrl.turnsNum.value = ctrl.turns?.value ?? 10;
    ctrl.tStep.value = ctrl.tStepNum.value = ctrl.tStep?.value ?? 0.01;
    ctrl.scale.value = ctrl.scaleNum.value = ctrl.scale?.value ?? 1;
    ctrl.rot.value = ctrl.rotNum.value = ctrl.rot?.value ?? 0;
    ctrl.lineColor.value = ctrl.lineColor?.value ?? '#2dd4bf';
    ctrl.lineW.value = ctrl.lineW?.value ?? 2;
    ctrl.asPoints.checked = !!ctrl.asPoints?.checked;
    ctrl.scanlines.checked = !!ctrl.scanlines?.checked;
    ctrl.mode3d.checked = !!ctrl.mode3d?.checked;
    ctrl.zPerTurn.value = ctrl.zPerTurnNum.value = ctrl.zPerTurn?.value ?? 120;
    ctrl.fov.value = ctrl.fovNum.value = ctrl.fov?.value ?? 700;
    ctrl.rxSpeed.value = ctrl.rxSpeedNum.value = ctrl.rxSpeed?.value ?? 0;
    ctrl.rySpeed.value = ctrl.rySpeedNum.value = ctrl.rySpeed?.value ?? 18;
    ctrl.rzSpeed.value = ctrl.rzSpeedNum.value = ctrl.rzSpeed?.value ?? 0;
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
})();