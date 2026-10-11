// Soundtrack: CC0 cyberpunk / synthwave loops (see MUSIC_CREDITS.md). Browsers block autoplay with sound,
// so it starts silent and plays only after an explicit tap on the sound button.
(() => {
  const TRACKS = [
    { name: 'Dark City', by: 'cinameng · CC0', src: 'assets/music/darkcity.mp3' },
    { name: 'Space City', by: 'MintoDog · CC0', src: 'assets/music/space-city.mp3' },
  ];
  const a = document.getElementById('bgm'), btn = document.getElementById('music'), np = document.getElementById('nowp');
  let i = 0, on = false, npT = 0; a.volume = 0;
  const load = () => { a.src = TRACKS[i].src; };
  const fade = (to, ms, done) => { const from = a.volume, t0 = performance.now(); const st = () => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = from + (to - from) * k; k < 1 ? requestAnimationFrame(st) : done && done(); }; st(); };
  const toast = () => { np.innerHTML = `<i></i><span>NOW PLAYING</span><b>${TRACKS[i].name}</b><em>${TRACKS[i].by}</em>`; np.classList.add('in'); clearTimeout(npT); npT = setTimeout(() => np.classList.remove('in'), 3800); };
  const ui = () => { btn.classList.toggle('on', on); btn.title = on ? 'Mute soundtrack' : 'Play soundtrack'; btn.setAttribute('aria-label', btn.title); };
  a.addEventListener('ended', () => { i = (i + 1) % TRACKS.length; load(); a.play().then(toast).catch(() => {}); });
  function set(v) { on = v; try { localStorage.setItem('bgm', on ? '1' : '0'); } catch (e) {}
    if (on) { if (!a.src) load(); a.play().then(() => { fade(.42, 1200); toast(); }).catch(() => { on = false; ui(); }); }
    else fade(0, 500, () => a.pause());
    ui(); }
  btn.addEventListener('click', e => { e.stopPropagation(); set(!on); });
  ui();
})();
