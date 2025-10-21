// Archimedes Spiral — PWA app.js
(function(){
  'use strict';

  // Install prompt handling
  let deferredPrompt;
  const btnInstall = document.getElementById('btnInstall');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if(btnInstall) btnInstall.style.display = 'inline-flex';
  });
  btnInstall?.addEventListener('click', async () => {
    try{
      await deferredPrompt?.prompt();
    }catch(_){} finally{
      deferredPrompt = null;
      btnInstall.style.display = 'none';
    }
  });

  // Register Service Worker
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
    btnReset: $('#btnReset')
  };

  // Sync helpers
  function linkRangeNumber(range, number){
    function syncToNum(){ number.value = range.value; draw(); }
    function syncToRange(){ range.value = number.value; draw(); }
    range.addEventListener('input', syncToNum);
    number.addEventListener('input', syncToRange);
  }
  linkRangeNumber(ctrl.a, ctrl.aNum);
  linkRangeNumber(ctrl.b, ctrl.bNum);
  linkRangeNumber(ctrl.turns, ctrl.turnsNum);
  linkRangeNumber(ctrl.tStep, ctrl.tStepNum);
  linkRangeNumber(ctrl.scale, ctrl.scaleNum);
  linkRangeNumber(ctrl.rot, ctrl.rotNum);

  ['lineColor','lineW','asPoints','scanlines'].forEach(id=>{
    ctrl[id].addEventListener('input', draw);
  });

  ctrl.btnReset.addEventListener('click', () => {
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

  // Drawing
  function draw(){
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2;
    const a = parseFloat(ctrl.a.value);
    const b = parseFloat(ctrl.b.value);
    const turns = parseInt(ctrl.turns.value, 10);
    const tStep = parseFloat(ctrl.tStep.value);
    const scale = parseFloat(ctrl.scale.value);
    const rotDeg = parseFloat(ctrl.rot.value);

    const tMax = turns * Math.PI * 2;
    const rot = rotDeg * Math.PI / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(scale, scale);

    ctx.strokeStyle = ctrl.lineColor.value;
    ctx.fillStyle = ctrl.lineColor.value;
    ctx.lineWidth = parseInt(ctrl.lineW.value, 10);

    let first = true;
    ctx.beginPath();

    for(let t = 0; t <= tMax; t += tStep){
      const r = a + b * t;
      const x = r * Math.cos(t);
      const y = -r * Math.sin(t);

      if (ctrl.asPoints.checked){
        ctx.fillRect(x, y, Math.max(1, ctx.lineWidth), Math.max(1, ctx.lineWidth));
      } else {
        if(first){
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      if (ctrl.scanlines.checked){
        // draw vertical bars relative to current coordinate system
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x, h/8 + 205); // similar effect to original
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
    if (!ctrl.asPoints.checked){
      ctx.stroke();
    }
    ctx.restore();
  }

  // Animation
  let animId = null;
  let animT = 0;
  function tick(){
    if(!ctrl.animate.checked){
      animId = null; return;
    }
    // gently rotate
    const rot = (parseFloat(ctrl.rot.value) + 0.3) % 360;
    ctrl.rot.value = ctrl.rotNum.value = rot.toFixed(1);
    draw();
    animId = requestAnimationFrame(tick);
  }
  ctrl.animate.addEventListener('change', ()=>{
    if (ctrl.animate.checked && !animId){ animId = requestAnimationFrame(tick); }
  });

  // Init
  resize();
  draw();
  // auto start animation off

  // ===== Preset Manager =====
  const presetSelect = document.getElementById('presetSelect');
  const presetName = document.getElementById('presetName');
  const btnSavePreset = document.getElementById('btnSavePreset');
  const btnDeletePreset = document.getElementById('btnDeletePreset');

  const PRESETS_KEY = 'arch_spiral_presets_v1';

  // Default presets
  const defaultPresets = {
    "Classico": {a:0,b:6,turns:10,tStep:0.01,scale:1,rot:0,lineColor:"#2dd4bf",lineW:2,asPoints:false,scanlines:false},
    "Punti delicati": {a:0,b:4,turns:16,tStep:0.02,scale:1,rot:0,lineColor:"#eaf1ff",lineW:2,asPoints:true,scanlines:false},
    "Scanline retro": {a:0,b:7,turns:12,tStep:0.015,scale:1,rot:0,lineColor:"#93a4cc",lineW:1,asPoints:false,scanlines:true},
    "Spessore artistico": {a:10,b:10,turns:8,tStep:0.008,scale:1,rot:15,lineColor:"#22c55e",lineW:4,asPoints:false,scanlines:false}
  };

  function loadPresets(){
    let data = localStorage.getItem(PRESETS_KEY);
    let obj = data ? JSON.parse(data) : {};
    // Merge without overwriting existing user presets
    for(const k in defaultPresets){
      if(!(k in obj)) obj[k] = defaultPresets[k];
    }
    localStorage.setItem(PRESETS_KEY, JSON.stringify(obj));
    return obj;
  }
  function savePresets(obj){
    localStorage.setItem(PRESETS_KEY, JSON.stringify(obj));
  }
  function refreshPresetSelect(selected){
    const obj = loadPresets();
    presetSelect.innerHTML = '';
    Object.keys(obj).sort().forEach(name=>{
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      if (selected && selected === name) opt.selected = true;
      presetSelect.appendChild(opt);
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
    draw();
  }

  presetSelect.addEventListener('change', () => {
    const all = loadPresets();
    const name = presetSelect.value;
    if (all[name]) applyPreset(all[name]);
  });

  btnSavePreset.addEventListener('click', () => {
    const name = presetName.value.trim();
    if (!name){ alert('Inserisci un nome preset'); return; }
    const all = loadPresets();
    all[name] = {
      a: parseFloat(ctrl.a.value),
      b: parseFloat(ctrl.b.value),
      turns: parseInt(ctrl.turns.value,10),
      tStep: parseFloat(ctrl.tStep.value),
      scale: parseFloat(ctrl.scale.value),
      rot: parseFloat(ctrl.rot.value),
      lineColor: ctrl.lineColor.value,
      lineW: parseInt(ctrl.lineW.value,10),
      asPoints: !!ctrl.asPoints.checked,
      scanlines: !!ctrl.scanlines.checked
    };
    savePresets(all);
    refreshPresetSelect(name);
    presetName.value = '';
  });

  btnDeletePreset.addEventListener('click', () => {
    const sel = presetSelect.value;
    const all = loadPresets();
    if (!sel || !(sel in all)){ return; }
    if (defaultPresets[sel]){ alert('Non puoi eliminare un preset di default'); return; }
    delete all[sel];
    savePresets(all);
    refreshPresetSelect();
  });

  // ===== Export PNG =====
  const btnExportPNG = document.getElementById('btnExportPNG');
  btnExportPNG.addEventListener('click', () => {
    // Render already on screen at device pixel ratio; export original canvas bitmap
    const a = document.createElement('a');
    a.download = 'archimedes_spiral.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  // ===== Export SVG =====
  const btnExportSVG = document.getElementById('btnExportSVG');
  btnExportSVG.addEventListener('click', () => {
    // Recreate the path in SVG space from current params
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    const cx = w/2, cy = h/2;

    const aVal = parseFloat(ctrl.a.value);
    const bVal = parseFloat(ctrl.b.value);
    const turns = parseInt(ctrl.turns.value,10);
    const tStep = parseFloat(ctrl.tStep.value);
    const scale = parseFloat(ctrl.scale.value);
    const rotDeg = parseFloat(ctrl.rot.value);
    const rot = rotDeg * Math.PI/180;

    let d = '';
    let first = true;
    for(let t = 0; t <= turns * Math.PI * 2; t += tStep){
      const r = aVal + bVal * t;
      let x = r * Math.cos(t);
      let y = -r * Math.sin(t);
      // apply transform
      const xr = x * Math.cos(rot) - y * Math.sin(rot);
      const yr = x * Math.sin(rot) + y * Math.cos(rot);
      x = cx + xr * scale;
      y = cy + yr * scale;
      if (first){
        d += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
        first = false;
      } else {
        if (ctrl.asPoints.checked){
          // small squares as points
          d += `m ${-0.5} ${-0.5} l 1 0 l 0 1 l -1 0 z `;
        } else {
          d += `L ${x.toFixed(2)} ${y.toFixed(2)} `;
        }
      }
    }

    const stroke = ctrl.lineColor.value;
    const lw = parseInt(ctrl.lineW.value,10);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Archimedes spiral">
  <rect width="100%" height="100%" fill="#0b1022"/>
  <path d="${d}" fill="${ctrl.asPoints.checked ? stroke : 'none'}" stroke="${ctrl.asPoints.checked ? 'none' : stroke}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

    const blob = new Blob([svg], {type:'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'archimedes_spiral.svg';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 500);
  });

  // Init presets UI
  refreshPresetSelect('Classico');
  applyPreset(loadPresets()['Classico']);

})();
