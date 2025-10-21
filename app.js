// Archimedes Spiral — PWA app.js (2D/3D + Animation)
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

  // --- SW ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
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
  function linkRangeNumber(range, number){
    function syncToNum(){ number.value = range.value; draw(); }
    function syncToRange(){ range.value = number.value; draw(); }
    range?.addEventListener('input', syncToNum);
    number?.addEventListener('input', syncToRange);
  }
  linkRangeNumber(ctrl.a, ctrl.aNum);
  linkRangeNumber(ctrl.b, ctrl.bNum);
  linkRangeNumber(ctrl.turns, ctrl.turnsNum);
  linkRangeNumber(ctrl.tStep, ctrl.tStepNum);
  linkRangeNumber(ctrl.scale, ctrl.scaleNum);
  linkRangeNumber(ctrl.rot, ctrl.rotNum);
  linkRangeNumber(ctrl.zPerTurn, ctrl.zPerTurnNum);
  linkRangeNumber(ctrl.fov, ctrl.fovNum);
  linkRangeNumber(ctrl.rxSpeed, ctrl.rxSpeedNum);
  linkRangeNumber(ctrl.rySpeed, ctrl.rySpeedNum);
  linkRangeNumber(ctrl.rzSpeed, ctrl.rzSpeedNum);

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
    draw();
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
    const a = parseFloat(ctrl.a.value);
    const b = parseFloat(ctrl.b.value);
    const turns = parseInt(ctrl.turns.value, 10);
    const tStep = parseFloat(ctrl.tStep.value);
    const scale = parseFloat(ctrl.scale.value);
    const rotDeg = parseFloat(ctrl.rot.value);
    const tMax = turns * Math.PI * 2;
    const rot = rotDeg * Math.PI / 180;

    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.strokeStyle = ctrl.lineColor.value;
    ctx.fillStyle = ctrl.lineColor.value;
    ctx.lineWidth = parseInt(ctrl.lineW.value, 10);

    let first = true;
    if (!ctrl.asPoints.checked) ctx.beginPath();
    for(let t = 0; t <= tMax; t += tStep){
      const r = a + b * t;
      const x = r * Math.cos(t);
      const y = -r * Math.sin(t);

      if (ctrl.asPoints.checked){
        ctx.fillRect(x, y, Math.max(1, ctx.lineWidth), Math.max(1, ctx.lineWidth));
      } else {
        if(first){ ctx.moveTo(x, y); first=false; }
        else ctx.lineTo(x, y);
      }

      if (ctrl.scanlines.checked){
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
    if (!ctrl.asPoints.checked) ctx.stroke();
    ctx.restore();
  }

  function draw3D(w, h){
    const a = parseFloat(ctrl.a.value);
    const b = parseFloat(ctrl.b.value);
    const turns = parseInt(ctrl.turns.value, 10);
    const tStep = parseFloat(ctrl.tStep.value);
    const scale = parseFloat(ctrl.scale.value);
    const uiRotZ = parseFloat(ctrl.rot.value) * Math.PI/180;
    const tMax = turns * Math.PI * 2;

    const zPerTurn = parseFloat(ctrl.zPerTurn.value);
    const fov = parseFloat(ctrl.fov.value);
    const color = ctrl.lineColor.value;
    const lw = parseInt(ctrl.lineW.value, 10);

    const ax = rotX * Math.PI/180;
    const ay = rotY * Math.PI/180;
    const az = (rotZ) * Math.PI/180 + uiRotZ;

    ctx.lineWidth = lw;

    // We'll draw as continuous polyline with depth-based alpha per segment
    let prev = null;
    for(let t = 0; t <= tMax; t += tStep){
      const r = (a + b * t) * scale;
      let x = r * Math.cos(t);
      let y = -r * Math.sin(t);
      let z = (zPerTurn * t) / (Math.PI * 2);

      const v = rotateXYZ(x, y, z, ax, ay, az);
      const p = project3D(v.x, v.y, v.z, fov, w, h);

      if (ctrl.asPoints.checked){
        const shade = Math.max(0.25, Math.min(1.0, 1.2 - (p.depth / (fov*2))));
        ctx.globalAlpha = shade;
        ctx.fillStyle = color;
        ctx.fillRect(p.x, p.y, Math.max(1, lw), Math.max(1, lw));
      } else if (prev){
        const shade = Math.max(0.25, Math.min(1.0, 1.2 - (p.depth / (fov*2))));
        ctx.globalAlpha = shade;
        ctx.strokeStyle = color;
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
      // in 2D, animate global rotation slowly
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
    }
  });

  // Init
  resize();
  draw();
})();