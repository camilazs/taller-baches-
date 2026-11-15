export function setupCapture(onFile, notify) {
  const $ = id => document.getElementById(id);
  let stream, opening = false, capturing = false, version = 0;
  function stop() {
    version++; opening = false;
    stream?.getTracks().forEach(track => track.stop()); stream = null;
    $('live-video').srcObject = null; $('live-panel').hidden = true; $('open-camera').disabled = false;
  }
  $('open-camera').onclick = async () => {
    if (opening || stream) return;
    if (!navigator.mediaDevices?.getUserMedia) return notify('La cámara en vivo requiere HTTPS o localhost. Usa «Tomar foto» para la cámara nativa del celular.');
    opening = true; $('open-camera').disabled = true;
    const requestVersion = ++version;
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      if (version !== requestVersion || document.hidden) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      $('live-panel').hidden = false; $('live-video').srcObject = stream; await $('live-video').play();
    } catch { stop(); notify('No se pudo abrir la cámara. Revisa el permiso o usa una imagen original.'); }
    finally { opening = false; }
  };
  $('close-camera').onclick = stop;
  $('capture-frame').onclick = async () => {
    const video = $('live-video');
    if (!stream || !video.videoWidth || capturing) return notify('Espera a que la cámara esté lista.');
    capturing = true; $('capture-frame').disabled = true;
    try {
      const canvas = document.createElement('canvas'); const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .85));
      if (!blob) throw new Error('No se pudo capturar.');
      await onFile(new File([blob], `captura-vial-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      stop();
    } catch { notify('No se pudo guardar la captura. Reintenta.'); }
    finally { capturing = false; $('capture-frame').disabled = false; }
  };
  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  return { stop };
}
