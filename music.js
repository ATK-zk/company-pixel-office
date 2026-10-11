// Background music: CC0 cyberpunk / synthwave loops (see MUSIC_CREDITS.md). Starts muted (browser autoplay policy); tap 🔇 to unmute.
(() => {
  const TRACKS = [
    { name: 'Dark City — cinameng, CC0', src: ['assets/music/darkcity.mp3'] },
    { name: 'Space City — MintoDog, CC0', src: ['assets/music/space-city.mp3'] },
  ];
  const a = document.getElementById('bgm'), btn = document.getElementById('music');
  let i = 0, on = false;
  a.volume = 0.4;
  const pick = t => t.src[0];
  const load = () => { a.src = pick(TRACKS[i]); btn.title = (on ? 'Music off · ' : 'Music on · ') + TRACKS[i].name; };
  const ui = () => { btn.textContent = on ? '🎵' : '🔇'; btn.classList.toggle('on', on); btn.setAttribute('aria-label', on ? 'Music off' : 'Music on'); load_title(); };
  const load_title = () => { btn.title = (on ? 'Music off · ' : 'Music on · ') + TRACKS[i].name; };
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
