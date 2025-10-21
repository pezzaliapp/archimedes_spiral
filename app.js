// Archimedes Spiral — PWA (GitHub Pages Optimized + Quality/Gradient/Recording + Auto Demo)
(function(){
  'use strict';

  // ===== Debug Overlay =====
  (function(){
    const el = document.createElement('div');
    el.id = 'debugOverlay';
    el.style.cssText = 'position:fixed;left:8px;bottom:8px;right:auto;z-index:99999;font:12px/1.3 system-ui;background:#0b1022cc;color:#eaf1ff;border:1px solid #31407a;border-radius:10px;padding:8px 10px;max-width:60vw;';
    el.innerHTML = '<b>Debug:</b> ready';
    document.addEventListener('DOMContentLoaded', ()=>document.body.appendChild(el));
    function log(msg){ console.log('[Spiral]', msg); el.innerHTML = '<b>Debug:</b> ' + msg; }
    window.__spiralLog = log;
    window.addEventListener('error', (e)=>{ el.innerHTML = '<b>Errore:</b> ' + e.message; console.error(e.error||e.message); });
    window.addEventListener('unhandledrejection', (e)=>{ el.innerHTML = '<b>Promise:</b> ' + e.reason; console.error(e.reason); });
  })();


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
  /* SW removed in debug build */catch(e){}
  }

  const $ = (s) => document.querySelector(s);
  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d'); __spiralLog('Canvas context: ' + (ctx ? 'ok' : 'null'));

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
    btnFramesZip: $('#btnFramesZip'),
    btnExportGIF: $('#btnExportGIF'),
    btnAutoQuality: $('#btnAutoQuality'),
    presetSelect: $('#presetSelect'), presetName: $('#presetName'), btnSavePreset: $('#btnSavePreset'), btnDeletePreset: $('#btnDeletePreset')
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
  function markDirty(){ computeGeometry(); draw(); __spiralLog('first draw done'); }

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
  function resize(){ __spiralLog('resize');
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

  function draw(){ /* draw */
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

  
  // ===== Qualità Auto (1s FPS test) =====
  function autoQuality(){
    const testDuration = 1000; // ms
    let frames = 0;
    const prevAnimate = ctrl.animate.checked;
    const start = performance.now();
    function testTick(now){
      frames++;
      // simple spin
      ctrl.rot.value = ctrl.rotNum.value = ((parseFloat(ctrl.rot.value)||0) + 90/60) % 360;
      draw();
      if (now - start < testDuration){
        requestAnimationFrame(testTick);
      } else {
        const fps = frames * 1000 / (now - start);
        let level = 'med';
        if (fps > 50) level = 'high';
        else if (fps > 30) level = 'med';
        else level = 'low';
        ctrl.quality.value = level;
        computeGeometry(); draw();
        if (!prevAnimate){ ctrl.animate.checked = false; }
        alert('FPS stimato: ' + fps.toFixed(0) + ' → Qualità: ' + (level=='high'?'Alta':level=='med'?'Media':'Bassa'));
      }
    }
    // ensure not animating (we control the loop)
    ctrl.animate.checked = false;
    requestAnimationFrame(testTick);
  }
  ctrl.btnAutoQuality?.addEventListener('click', autoQuality);

  // --- Recording (WebM via MediaRecorder) ---
  let mediaRecorder = null;
  let recordedChunks = [];
  let _recPump = null;
  let _recPrev = null;

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
      // restore previous speeds if we changed them
      if (_recPrev && _recPrev.changed3D){
        ctrl.rxSpeed.value = ctrl.rxSpeedNum.value = _recPrev.rx;
        ctrl.rySpeed.value = ctrl.rySpeedNum.value = _recPrev.ry;
        ctrl.rzSpeed.value = ctrl.rzSpeedNum.value = _recPrev.rz;
      }
      if (_recPump){ clearInterval(_recPump); _recPump = null; }
      _recPrev = null;
    };
    mediaRecorder.start();
    ctrl.btnStopRecord.disabled = false;
    ctrl.btnRecordWebM.disabled = true;

    // ensure animation is running
    const wasAnimating = ctrl.animate.checked;
    if (!wasAnimating){ ctrl.animate.checked = true; last = performance.now(); if(!animId) animId = requestAnimationFrame(tick); }

    // if in 3D and all speeds are ~0, set a default Y spin so video non è statico
    _recPrev = { rx: parseFloat(ctrl.rxSpeed.value)||0, ry: parseFloat(ctrl.rySpeed.value)||0, rz: parseFloat(ctrl.rzSpeed.value)||0, changed3D: false };
    if (ctrl.mode3d.checked){
      const isStill = Math.abs(_recPrev.rx) < 0.1 && Math.abs(_recPrev.ry) < 0.1 && Math.abs(_recPrev.rz) < 0.1;
      if (isStill){
        ctrl.rySpeed.value = ctrl.rySpeedNum.value = 18;
        _recPrev.changed3D = true;
      }
    }

    // fallback pump: some browsers throttle rAF during recording/inactive tabs
    if (_recPump){ clearInterval(_recPump); }
    _recPump = setInterval(()=>{
      if (!animId){
        last = performance.now();
        animId = requestAnimationFrame(tick);
      }
    }, 1000/30);
  }
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
    try{ mediaRecorder?.stop(); }catch(_){}
  }

  ctrl.btnRecordWebM?.addEventListener('click', startWebM);
  ctrl.btnStopRecord?.addEventListener('click', stopWebM);

  // --- PNG frames ZIP (fallback for GIF via strumenti esterni) ---
  
  // --- Export GIF (beta) — 2-color palette (bg + line); best with Gradient=None ---
  ctrl.btnExportGIF?.addEventListener('click', async ()=>{
    if ((ctrl.gradientMode?.value || 'none') !== 'none'){
      alert('Per ora il GIF export funziona meglio con Gradiente = Nessuno.');
      return;
    }
    const seconds = 4, fps = 20;
    const total = seconds * fps;
    const delayCs = Math.round(100 / fps); // delay in 1/100 s units per frame
    const w = 512, h = 512; // fixed export size
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const octx = off.getContext('2d');

    // temporary render: draw current view scaled to 512x512
    const frames = [];
    const prevAnim = ctrl.animate.checked;
    if (!prevAnim){ ctrl.animate.checked = true; last = performance.now(); if(!animId) animId = requestAnimationFrame(tick); }

    for (let i=0;i<total;i++){
      await new Promise(r=>setTimeout(r, 1000/fps));
      octx.fillStyle = '#0b1022'; octx.fillRect(0,0,w,h);
      // draw current canvas into offscreen
      octx.drawImage(canvas, 0, 0, w, h);
      const img = octx.getImageData(0,0,w,h);
      frames.push(img);
    }
    if (!prevAnim){ ctrl.animate.checked = false; }

    // Build a very simple GIF with 2-color global palette: bg + average line color
    function avgLineRGB(){
      // sample center pixel ring to guess line color; fallback to chosen lineColor
      const hex = ctrl.lineColor.value;
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if(!m) return {r:45,g:212,b:191};
      return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)};
    }
    const lineRGB = avgLineRGB();
    const bg = {r:11,g:16,b:34};
    const palette = [bg.r,bg.g,bg.b, lineRGB.r,lineRGB.g,lineRGB.b]; // 2 colors

    // LZW encoder for GIF (minimal)
    function lzwEncode(indices, minCodeSize){
      const CLEAR = 1 << minCodeSize;
      const END = CLEAR + 1;
      let dict = new Map();
      let nextCode = END + 1;
      const bits = [];
      function writeBits(code, nbits){
        for(let i=0;i<nbits;i++){
          bits.push((code >> i) & 1);
        }
      }
      let codeSize = minCodeSize + 1;
      let string = indices[0].toString();
      writeBits(CLEAR, codeSize);
      for(let i=1;i<indices.length;i++){
        const ch = indices[i].toString();
        const strch = string + ',' + ch;
        if (dict.has(strch)){
          string = strch;
        } else {
          // output code for string
          const out = string.indexOf(',')===-1 ? parseInt(string,10) : dict.get(string);
          writeBits(out, codeSize);
          // add to dict
          dict.set(strch, nextCode++);
          // bump code size
          if (nextCode === (1<<codeSize) && codeSize < 12) codeSize++;
          string = ch;
        }
      }
      const out = string.indexOf(',')===-1 ? parseInt(string,10) : dict.get(string);
      writeBits(out, codeSize);
      writeBits(END, codeSize);
      // pack bits into bytes, little-endian per sub-block
      const bytes = [];
      for(let i=0;i<bits.length;i+=8){
        let b=0;
        for(let j=0;j<8 && i+j<bits.length;j++){
          b |= bits[i+j] << j;
        }
        bytes.push(b);
      }
      return new Uint8Array(bytes);
    }

    function buildGIF(frames){
      const w = frames[0].width, h = frames[0].height;
      const stream = [];
      function pushBytes(arr){ for(let i=0;i<arr.length;i++) stream.push(arr[i]); }
      function pushStr(s){ for(let i=0;i<s.length;i++) stream.push(s.charCodeAt(i)); }

      // Header + LSD
      pushStr('GIF89a');
      // Logical Screen Descriptor
      stream.push(w & 0xFF, (w>>8)&0xFF, h & 0xFF, (h>>8)&0xFF);
      // GCT flag(1) | color res(3) | sort(1) | size of GCT(3) -> 2 colors => size code 0 (2^(0+1)=2)
      stream.push(0x80 | (7<<4) | 0x00 | 0x00);
      // Background color index
      stream.push(0x00);
      // Pixel aspect ratio
      stream.push(0x00);
      // Global Color Table (2 entries, padded to 2^1=2)
      pushBytes(palette);

      for (let f=0; f<frames.length; f++){
        const img = frames[f];
        // Graphic Control Extension
        pushBytes([0x21, 0xF9, 0x04, 0x00, delayCs & 0xFF, (delayCs>>8)&0xFF, 0x00, 0x00]);
        // Image Descriptor
        pushBytes([0x2C, 0x00,0x00, 0x00,0x00, w & 0xFF,(w>>8)&0xFF, h & 0xFF,(h>>8)&0xFF, 0x00]);

        // Build indices: 0 for bg, 1 for line (threshold on distance to bg vs line color)
        const data = img.data;
        const idx = new Uint8Array(w*h);
        for(let i=0,j=0;i<data.length;i+=4,j++){
          const r=data[i],g=data[i+1],b=data[i+2];
          const db = Math.hypot(r-bg.r,g-bg.g,b-bg.b);
          const dl = Math.hypot(r-lineRGB.r,g-lineRGB.g,b-lineRGB.b);
          idx[j] = dl < db ? 1 : 0;
        }
        // LZW min code size = 2 (for 2 colors)
        const lzw = lzwEncode(idx, 1); // minCodeSize 1 -> codes 0,1; clear=2, end=3
        // Write LZW min code size byte
        stream.push(0x01);
        // Sub-blocks (size<=255)
        let p=0;
        while (p < lzw.length){
          const n = Math.min(255, lzw.length - p);
          stream.push(n);
          for(let k=0;k<n;k++) stream.push(lzw[p+k]);
          p += n;
        }
        // Block terminator
        stream.push(0x00);
      }

      // Trailer
      stream.push(0x3B);
      return new Blob([new Uint8Array(stream)], {type:'image/gif'});
    }

    const gif = buildGIF(frames);
    const url = URL.createObjectURL(gif);
    const a = document.createElement('a');
    a.href = url; a.download = 'archimedes_spiral.gif';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 500);
  });

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

  
  // ===== Preset Manager (with Demo Show) =====
  const PRESETS_KEY = 'arch_spiral_presets_v2';
  const defaultPresets = {
    "Classico": {a:0,b:6,turns:10,tStep:0.01,scale:1,rot:0,lineColor:"#2dd4bf",lineW:2,asPoints:false,scanlines:false,mode3d:false,gradientMode:"none",quality:"med",rx:0,ry:0,rz:0,zPerTurn:120,fov:700,animate:false},
    "Punti delicati": {a:0,b:4,turns:16,tStep:0.02,scale:1,rot:0,lineColor:"#eaf1ff",lineW:2,asPoints:true,scanlines:false,mode3d:false,gradientMode:"none",quality:"med",rx:0,ry:0,rz:0,zPerTurn:120,fov:700,animate:false},
    "Scanline retro": {a:0,b:7,turns:12,tStep:0.015,scale:1,rot:0,lineColor:"#93a4cc",lineW:1,asPoints:false,scanlines:true,mode3d:false,gradientMode:"none",quality:"low",rx:0,ry:0,rz:0,zPerTurn:120,fov:700,animate:false},
    "Spessore artistico": {a:10,b:10,turns:8,tStep:0.008,scale:1,rot:15,lineColor:"#22c55e",lineW:4,asPoints:false,scanlines:false,mode3d:false,gradientMode:"none",quality:"high",rx:0,ry:0,rz:0,zPerTurn:120,fov:700,animate:false},
    "Demo Show": {a:0,b:6,turns:14,tStep:0.012,scale:1,rot:0,lineColor:"#2dd4bf",lineW:2,asPoints:false,scanlines:false,mode3d:true,gradientMode:"depth",quality:"med",rx:8,ry:18,rz:0,zPerTurn:140,fov:740,animate:true}
  };
  function loadPresets(){
    let data = localStorage.getItem(PRESETS_KEY);
    let obj = data ? JSON.parse(data) : {};
    for(const k in defaultPresets){ if(!(k in obj)) obj[k] = defaultPresets[k]; }
    localStorage.setItem(PRESETS_KEY, JSON.stringify(obj));
    return obj;
  }
  function savePresets(obj){ localStorage.setItem(PRESETS_KEY, JSON.stringify(obj)); }
  function refreshPresetSelect(selected){
    const obj = loadPresets();
    const sel = ctrl.presetSelect;
    if (!sel) return;
    sel.innerHTML = '';
    Object.keys(obj).sort().forEach(name=>{
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      if (selected && selected === name) opt.selected = true;
      sel.appendChild(opt);
    });
  }
  function applyPreset(p){
    ctrl.a.value = ctrl.aNum.value = p.a;
    ctrl.b.value = ctrl.bNum.value = p.b;
    ctrl.turns.value = ctrl.turnsNum.value = p.turns;
    ctrl.tStep.value = ctrl.tStepNum.value = p.tStep;
    ctrl.scale.value = ctrl.scaleNum.value = p.scale;
    ctrl.rot.value = ctrl.rotNum.value = p.rot;
    ctrl.lineColor.value = p.lineColor;
    ctrl.lineW.value = p.lineW;
    ctrl.asPoints.checked = !!p.asPoints;
    ctrl.scanlines.checked = !!p.scanlines;
    ctrl.mode3d.checked = !!p.mode3d;
    ctrl.gradientMode.value = p.gradientMode || 'none';
    ctrl.quality.value = p.quality || 'med';
    ctrl.rxSpeed.value = ctrl.rxSpeedNum.value = p.rx || 0;
    ctrl.rySpeed.value = ctrl.rySpeedNum.value = p.ry || 0;
    ctrl.rzSpeed.value = ctrl.rzSpeedNum.value = p.rz || 0;
    ctrl.zPerTurn.value = ctrl.zPerTurnNum.value = p.zPerTurn || 120;
    ctrl.fov.value = ctrl.fovNum.value = p.fov || 700;
    ctrl.animate.checked = !!p.animate;
    computeGeometry();
    draw();
    // start animation if preset says so
    if (ctrl.animate.checked){ last = performance.now(); if(!animId) animId = requestAnimationFrame(tick); }
  }
  ctrl.presetSelect?.addEventListener('change', ()=>{
    const all = loadPresets(); const name = ctrl.presetSelect.value; if (all[name]) applyPreset(all[name]);
  });
  ctrl.btnSavePreset?.addEventListener('click', ()=>{
    const name = (ctrl.presetName?.value || '').trim(); if (!name){ alert('Inserisci un nome preset'); return; }
    const all = loadPresets();
    all[name] = {
      a: parseFloat(ctrl.a.value), b: parseFloat(ctrl.b.value), turns: parseInt(ctrl.turns.value,10), tStep: parseFloat(ctrl.tStep.value),
      scale: parseFloat(ctrl.scale.value), rot: parseFloat(ctrl.rot.value), lineColor: ctrl.lineColor.value, lineW: parseInt(ctrl.lineW.value,10),
      asPoints: !!ctrl.asPoints.checked, scanlines: !!ctrl.scanlines.checked, mode3d: !!ctrl.mode3d.checked,
      gradientMode: ctrl.gradientMode.value, quality: ctrl.quality.value,
      rx: parseFloat(ctrl.rxSpeed.value)||0, ry: parseFloat(ctrl.rySpeed.value)||0, rz: parseFloat(ctrl.rzSpeed.value)||0,
      zPerTurn: parseFloat(ctrl.zPerTurn.value)||120, fov: parseFloat(ctrl.fov.value)||700,
      animate: !!ctrl.animate.checked
    };
    savePresets(all); refreshPresetSelect(name); ctrl.presetName.value='';
  });
  ctrl.btnDeletePreset?.addEventListener('click', ()=>{
    const sel = ctrl.presetSelect?.value; const all = loadPresets(); if (!sel || !(sel in all)) return;
    if (defaultPresets[sel]){ alert('Non puoi eliminare un preset di default'); return; }
    delete all[sel]; savePresets(all); refreshPresetSelect();
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

  window.addEventListener('resize', ()=>{ __spiralLog('resize+compute');
  resizeAndCompute(); draw(); });

  __spiralLog('init defaults');
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