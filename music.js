// Background music: CC0 medieval-town loops (see MUSIC_CREDITS.md). Starts muted (browser autoplay policy); tap 🔇 to unmute.
(() => {
  const TRACKS = [
    { name: 'Shakkar — Chris Murphy (zesona), CC0', src: ['assets/music/shakkar.mp3', 'assets/music/shakkar.ogg'] },
    { name: 'Medieval Village Square — Tozan, CC0', src: ['assets/music/village-square.mp3', 'assets/music/village-square.ogg'] },
  ];
  const a = document.getElementById('bgm'), btn = document.getElementById('music');
  let i = 0, on = false;
  a.volume = 0.45;
  const pick = t => (a.canPlayType('audio/mpeg') ? t.src[0] : t.src[1]);
  const load = () => { a.src = pick(TRACKS[i]); btn.title = (on ? 'ปิดเพลง · ' : 'เปิดเพลง · ') + TRACKS[i].name; };
  const ui = () => { btn.textContent = on ? '🎵' : '🔇'; btn.classList.toggle('on', on); btn.setAttribute('aria-label', on ? 'ปิดเพลง' : 'เปิดเพลง'); load_title(); };
  const load_title = () => { btn.title = (on ? 'ปิดเพลง · ' : 'เปิดเพลง · ') + TRACKS[i].name; };
  a.addEventListener('ended', () => { i = (i + 1) % TRACKS.length; load(); a.play().catch(() => {}); });
  load(); a.muted = true; a.play().catch(() => {});
  function set(v) {
    on = v; a.muted = !on; try { localStorage.setItem('bgm', on ? '1' : '0'); } catch (e) {}
    if (on) a.play().catch(() => { on = false; a.muted = true; ui(); }); ui();
  }
  btn.addEventListener('click', e => { e.stopPropagation(); set(!on); });
  // If the user turned music on last visit, resume on their first tap (autoplay with sound needs a gesture).
  let want = false; try { want = localStorage.getItem('bgm') === '1'; } catch (e) {}
  if (want) addEventListener('pointerdown', function f(e) { removeEventListener('pointerdown', f, true); if (!on && e.target !== btn) set(true); }, true);
  ui();
})();
