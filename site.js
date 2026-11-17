/* =========================================================
   TAMID at UCLA: shared behavior for every page
   (menu, scroll animations, smooth scrolling, footer year)
   You normally never need to edit this file.
   ========================================================= */

// Nav turns white once you scroll past the top
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll); onScroll();

// Mobile menu open/close
const burger = document.getElementById('burger'), links = document.getElementById('links');
burger.addEventListener('click', () => { links.classList.toggle('open'); nav.classList.toggle('menu-open'); });
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  links.classList.remove('open'); nav.classList.remove('menu-open');
}));

// Fade things in as you scroll. They reset when they leave the screen,
// so the animation replays every time you scroll back to them.
const io = new IntersectionObserver(es => es.forEach(e => {
  e.target.classList.toggle('in', e.isIntersecting);
}), { threshold: .12 });
function observeReveals(root = document) {
  root.querySelectorAll('.reveal').forEach(el => io.observe(el));
}
observeReveals();

// Smooth glide when clicking a link to a section on the SAME page
const NAV_HEIGHT = 76;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function glideTo(targetY) {
  const startY = window.scrollY, dist = targetY - startY;
  const duration = Math.min(1100, 450 + Math.abs(dist) * 0.25);
  let start = null;
  function step(now) {
    if (start === null) start = now;
    const t = Math.min((now - start) / duration, 1);
    window.scrollTo(0, startY + dist * ease(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', ev => {
  const id = a.getAttribute('href').slice(1);
  const target = id ? document.getElementById(id) : null;
  if (!target && id !== 'top') return;
  ev.preventDefault();
  const y = id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY -
            (target.classList.contains('hero') ? 0 : NAV_HEIGHT);
  glideTo(Math.max(0, y));
  history.replaceState(null, '', '#' + id);
}));

document.getElementById('yr').textContent = new Date().getFullYear();
