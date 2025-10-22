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

  // Registrazione (opzionali: se sono in index.html)
  const recSecs = $('recSecs');
  const btnRecWebM = $('btnRecWebM');
  const btnStopRec = $('btnStopRec');
  const btnFrames = $('btnFrames');
  const recBanner = $('recBanner');

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

  // --- Color helpers + gradient mix ---
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

      const N = P2.length;
      const maxR = Math.max(1, N ? Math.max(...P2.map(p=>Math.hypot(p.x,p.y))) : 1);

      if (asPts){
        for(let i=0;i<N;i++){
          const p = P2[i];
          let tcol = col;
          if (grad==='radius' || grad==='depth'){ // depth in 2D ~ radius
            const tt = Math.hypot(p.x,p.y)/maxR; const c = mixTowardLight(base, Math.min(1, tt*0.9)); tcol = rgbToCss(c.r,c.g,c.b,1);
          } else if (grad==='angle'){
            const tt = i/Math.max(1,N-1); const c = mixTowardLight(base, tt*0.9); tcol = rgbToCss(c.r,c.g,c.b,1);
          }
          ctx.fillStyle = tcol;
          ctx.fillRect(p.x,p.y,ctx.lineWidth,ctx.lineWidth);
        }
      } else {
        if (N>0){
          ctx.beginPath(); ctx.moveTo(P2[0].x, P2[0].y);
          for(let i=1;i<N;i++){
            const p = P2[i];
            let tcol = col;
            if (grad==='radius' || grad==='depth'){
              const tt = Math.hypot(p.x,p.y)/maxR; const c = mixTowardLight(base, Math.min(1, tt*0.9)); tcol = rgbToCss(c.r,c.g,c.b,1);
            } else if (grad==='angle'){
              const tt = i/Math.max(1,N-1); const c = mixTowardLight(base, tt*0.9); tcol = rgbToCss(c.r,c.g,c.b,1);
            }
            ctx.lineTo(p.x,p.y);
            ctx.strokeStyle = tcol;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(p.x,p.y);
          }
        }
      }
      ctx.restore();
      return;
    }

    // --- 3D ---
    const fov = parseFloat(fovEl.value);
    const angY = (t * (parseFloat(ry.value)*Math.PI/180));
    let prev = null;
    const N3 = P3.length;
    const lastR = N3 ? P3[N3-1].r : 1;

    for(let i=0;i<N3;i++){
      const b = P3[i];
      const rY = rotateY(b.x, b.y, b.z, angY);
      const p = project3D(rY.x, rY.y, rY.z, fov, w, h);

      let tcol = col;
      if (grad==='depth'){
        const tt = Math.max(0, Math.min(1, 1 - (p.d/(fov*2)))); const c = mixTowardLight(base, tt*0.9); tcol = rgbToCss(c.r,c.g,c.b,1);
      } else if (grad==='radius'){
        const tt = Math.min(1, b.r / Math.max(1,lastR)); const c = mixTowardLight(base, tt*0.9); tcol = rgbToCss(c.r,c.g,c.b,1);
      } else if (grad==='angle'){
        const tt = i/Math.max(1,N3-1); const c = mixTowardLight(base, tt*0.9); tcol = rgbToCss(c.r,c.g,c.b,1);
      }

      if (asPts){
        ctx.fillStyle = tcol;
        ctx.fillRect(p.x, p.y, ctx.lineWidth, ctx.lineWidth);
      } else if (prev){
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = tcol;
        ctx.stroke();
      }
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

  // ===== Export Animato + Banner =====
  let mediaRecorder = null, recordedChunks = [], pump = null;

  function showRecBanner(on){
    if (!recBanner) return;
    recBanner.style.display = on ? 'flex' : 'none';
  }

  function startRecWebM(){
    if (!('MediaRecorder' in window)) { alert('MediaRecorder non supportato'); return; }
    const secs = Math.max(1, Math.min(30, parseInt((recSecs && recSecs.value) || '5',10)));
    const stream = cv.captureStream(60);
    let opts = {mimeType:'video/webm;codecs=vp9'};
    try{ mediaRecorder = new MediaRecorder(stream, opts); }
    catch(e){ try{ mediaRecorder = new MediaRecorder(stream, {mimeType:'video/webm'}); }
              catch(_){ alert('Registrazione non disponibile'); return; } }
    recordedChunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data.size>0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, {type: mediaRecorder.mimeType || 'video/webm'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'archimedes_spiral.webm'; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 500);
      if (btnStopRec) btnStopRec.disabled = true;
      if (btnRecWebM) btnRecWebM.disabled = false;
      if (pump) { clearInterval(pump); pump = null; }
      showRecBanner(false);
    };
    mediaRecorder.start();
    if (btnRecWebM) btnRecWebM.disabled = true;
    if (btnStopRec) btnStopRec.disabled = false;
    showRecBanner(true);

    const wasAnimating = animate.checked;
    if (!wasAnimating){ animate.checked = true; startTime = performance.now(); requestAnimationFrame(tick); }
    if (pump) clearInterval(pump);
    pump = setInterval(()=>{ if (animate.checked){ draw((performance.now()-startTime)/1000); } }, 1000/30);

    setTimeout(()=>{ try{ mediaRecorder.stop(); }catch(_){ } }, secs*1000);
  }
  function stopRecWebM(){ try{ mediaRecorder?.stop(); }catch(_){ showRecBanner(false); } }

  async function saveFramesPNG(){
    const secs = Math.max(1, Math.min(10, parseInt((recSecs && recSecs.value) || '5',10)));
    const fps = 30, frames = secs*fps, delay = 1000/fps;
    const prev = animate.checked;
    if (!prev){ animate.checked = true; startTime = performance.now(); requestAnimationFrame(tick); }
    for (let i=0;i<frames;i++){
      await new Promise(r=>setTimeout(r, delay));
      const a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = `frame_${String(i).padStart(3,'0')}.png`;
      a.click();
    }
    if (!prev){ animate.checked = false; draw(0); }
  }

  if (btnRecWebM) btnRecWebM.addEventListener('click', startRecWebM);
  if (btnStopRec) btnStopRec.addEventListener('click', stopRecWebM);
  if (btnFrames)  btnFrames.addEventListener('click', saveFramesPNG);

  // Loop
  function tick(now){ if (!animate.checked){ draw(0); return; } const t=(now-startTime)/1000; draw(t); requestAnimationFrame(tick); }
  let startTime = performance.now();

  // Init
  sync3dUI(); resize(); compute(); startTime = performance.now(); requestAnimationFrame(tick);
})();
