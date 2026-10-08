/* skywalker.js — what both pages share (2026-09-30).

   index.html (the bill tracker, published data) and leadership.html (the live side)
   are separate files on purpose - see the note at the top of leadership.html. They
   must still look like ONE thing to everybody, with the difference being permissions.
   So the SHELL lives here, once: the colour themes and the Motion switch, the tab tray
   with the one menu, the loading screen, the touch ripple and the icon sprite. Each
   page keeps its own screens and its own data loading.

   Loaded with <script src="skywalker.js"> from the page's own folder; the CSP on
   index.html allows same-origin scripts for exactly this. No outside address is ever
   loaded. Published by ops/publish_to_pages.py with everything else in publish/site.

   What a page calls:
     Skywalker.buildTray({nav, page, who, active, onTab, badges}) draw the menu
     Skywalker.showTodo(tasks, {href})                              the "you owe" card
     Skywalker.setActive(nav, id)                                  mark the open tab
     Skywalker.hideSplash()                                        take the loading screen down
     Skywalker.setTheme(name) / setMotion(on)                      (the panel does this itself)
*/
(function(){
  'use strict';
  const LSK = {theme: 'skywalker.theme.v1', motion: 'skywalker.motion.v1'};
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // ── themes and motion ───────────────────────────────────────────────
  // Seven washes, the way the 3DS sells themes: the background and the accent change,
  // the white tiles do not. Names the pages saved before 2026-09-30 (light, dark, aero,
  // ticker) map onto the nearest wash instead of resetting anyone's choice.
  const THEMES = ['slate', 'rose', 'sky', 'mint', 'lavender', 'peach', 'night'];
  const THEME_ALIAS = {light: 'slate', dark: 'night', aero: 'sky', ticker: 'mint'};
  function setTheme(t){
    t = THEME_ALIAS[t] || t;
    if (!THEMES.includes(t)) t = 'slate';
    document.documentElement.dataset.theme = t;
    save(LSK.theme, t);
    document.querySelectorAll('[data-theme-pick]').forEach(b => b.classList.toggle('on', b.dataset.themePick === t));
  }
  // Motion: off when the system asks for reduced motion, unless this device chose
  // otherwise in the panel. With it off nothing drifts, shimmers or slides; the
  // breathing colour on names and committees carries on regardless (it is colour, not
  // movement, and the office asked for it that way).
  function setMotion(on){
    document.documentElement.dataset.motion = on ? 'on' : 'off';
    const c = document.getElementById('motionchk');
    if (c) c.checked = !!on;
    save(LSK.motion, !!on);
  }
  setTheme(load(LSK.theme, 'slate'));
  setMotion(load(LSK.motion, !matchMedia('(prefers-reduced-motion: reduce)').matches));

  function wireThemePanel(){
    const btn = document.getElementById('themebtn'), panel = document.getElementById('themepanel');
    const chk = document.getElementById('motionchk');
    if (!btn || !panel) return;
    setTheme(document.documentElement.dataset.theme);   // mark the swatch
    if (chk){ chk.checked = document.documentElement.dataset.motion !== 'off'; chk.onchange = () => setMotion(chk.checked); }
    const toggle = open => {
      const show = open ?? panel.hidden;
      panel.hidden = !show;
      btn.setAttribute('aria-expanded', String(show));
    };
    btn.onclick = e => { e.stopPropagation(); toggle(); };
    panel.onclick = e => {
      e.stopPropagation();
      const b = e.target.closest('[data-theme-pick]');
      if (b) setTheme(b.dataset.themePick);
    };
    document.addEventListener('click', () => { if (!panel.hidden) toggle(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
  }

  // ── the ripple ──────────────────────────────────────────────────────
  // A tap on a tile, tab, pill or button spreads a soft circle out from where the
  // finger landed. It only says "that registered", and is gone in half a second.
  document.addEventListener('pointerdown', e => {
    if (document.documentElement.dataset.motion === 'off') return;
    const el = e.target.closest('.card[role="button"], nav#tabs button, nav#tabs a, button.pill, .subnav button, .btn, .pos button, .chips button, button.primary, .next-step, .seg button');
    if (!el) return;
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    el.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }, {passive: true});

  // ── the loading screen ──────────────────────────────────────────────
  // Goes once there is something to look at: the first screen, the sign-in, or an
  // error. A safety timer takes it down regardless, so a stuck load can never leave
  // someone staring at the logo.
  function hideSplash(){
    const s = document.getElementById('splash');
    if (!s) return;
    s.classList.add('gone');
    setTimeout(() => s.remove(), 450);
  }
  setTimeout(hideSplash, 12000);

  // ── the icons ───────────────────────────────────────────────────────
  // Drawn inline (no outside files). <use href="#i-…"> anywhere on either page; a new
  // icon is one line here and nothing else.
  const ICONS = {
    star: '<path d="M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 21l1.2-6.5L2.5 9.9 9.1 9z"/>',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    note: '<path d="M4 20h4l10-10-4-4L4 16zM13 7l4 4"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    building: '<path d="M3 21h18M5 21V5l7-2 7 2v16M9 9h2M13 9h2M9 13h2M13 13h2M9 17h2M13 17h2"/>',
    flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
    bill: '<path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    tally: '<path d="M4 6h16M4 12h10M4 18h13"/>',
    board: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18M9 10v10"/>',
    import: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    plan: '<path d="M4 5h16v14H4zM8 9h8M8 13h5"/>',
    todo: '<path d="M4 6l2 2 3-3M4 13l2 2 3-3M4 19h5M12 6h8M12 13h8M12 19h8"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  };
  function injectSprite(){
    if (document.getElementById('i-star')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('style', 'position:absolute'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');
    document.body.prepend(svg);
  }

  // ── the one menu ────────────────────────────────────────────────────
  // Every tab, on both pages, in the order people see them. `page` says which file
  // draws it: on that page the entry is a button that switches screens; on the other
  // it is a link. `need` says who is shown it:
  //     (none)      everyone
  //     committee   leadership, or someone with a role on a committee
  //     whip        leadership offices: leadership, leadership staff, the whip, deputies
  //     role        anyone who holds any role
  // That only decides what is DRAWN. What a person gets when they open an entry is
  // decided by api_call() in the database (schema/14 and schema/23), never here.
  //
  // Condensed on 2026-10-01 at the office's request, from thirteen entries: Members,
  // Organizations and Notes live inside "Bills & People"; Hearings is a part of
  // Activity; the Board is an option on the Watchlist; Today is called To Do; Chairman
  // Plans is the Calendar (a committee day with its bills and business IS the plan).
  const MENU = [
    {id: 'watch',     label: 'Watchlist',      icon: 'star',   tint: '#e2a400', page: 'index',      href: 'index.html#/watch'},
    {id: 'feed',      label: 'Activity',       icon: 'pulse',  tint: '#2aa198', page: 'index',      href: 'index.html#/feed'},
    {id: 'search',    label: 'Bills & People', icon: 'bill',   tint: '#2f6fd6', page: 'index',      href: 'index.html#/search'},
    {id: 'calendar',  label: 'Calendar',       icon: 'cal',    tint: '#6a4c93', page: 'index',      href: 'index.html#/calendar',     need: 'committee'},
    {id: 'home',      label: 'To Do',          icon: 'todo',   tint: '#c2521c', page: 'leadership', href: 'leadership.html#home',     need: 'role'},
    {id: 'whip',      label: 'Whip',           icon: 'tally',  tint: '#7a1c26', page: 'leadership', href: 'leadership.html#whip',     need: 'whip'},
    {id: 'import',    label: 'Import',         icon: 'import', tint: '#5d3fb8', page: 'leadership', href: 'leadership.html#import',   need: 'role'},
  ];
  function can(need, who){
    if (!need) return true;
    if (!who) return false;
    const roles = who.roles || [];
    const lead = !!who.is_leadership || roles.includes('leadership') || roles.includes('leadership_staff');
    if (need === 'whip') return lead || !!who.is_whip || !!who.is_deputy || roles.includes('whip') || roles.includes('deputy_whip');
    if (need === 'committee') return lead || (who.committees || []).length > 0;
    if (need === 'role') return roles.length > 0;
    return false;
  }
  // opts: {nav, page, who, active, onTab, badges}
  //   who     the whoami answer ({roles, committees, is_leadership, ...}); before it has
  //           arrived, only the entries everyone gets are drawn
  //   badges  {entry id: count}, e.g. how many things are owed, on To Do
  function buildTray(opts){
    const nav = opts.nav || document.getElementById('tabs');
    if (!nav) return;
    const items = MENU.filter(m => can(m.need, opts.who));
    nav.innerHTML = items.map(m => {
      const ico = `<span class="ico" style="--tint:${m.tint}"><svg class="i"><use href="#i-${m.icon}"/></svg></span>`;
      const count = opts.page === 'index' && m.id === 'watch' ? ' <span id="wcount" class="n"></span>' : '';
      const badge = opts.badges && opts.badges[m.id] ? `<span class="badge">${Number(opts.badges[m.id])}</span>` : '';
      if (m.page === opts.page)
        return `<button data-tab="${m.id}" class="${m.id === opts.active ? 'on' : ''}" aria-selected="${m.id === opts.active}">${ico}<span>${esc(m.label)}${count}</span>${badge}</button>`;
      return `<a class="navlink" href="${m.href}">${ico}<span>${esc(m.label)}</span>${badge}</a>`;
    }).join('');
    if (opts.onTab) nav.querySelectorAll('button[data-tab]').forEach(b => b.onclick = () => opts.onTab(b.dataset.tab));
    const cur = nav.querySelector('button[aria-selected="true"]');
    if (cur) centerInTray(nav, cur);
  }
  // The tray scrolls sideways on a phone: bring the open tab to its middle by moving the
  // TRAY's own scroll position. Not scrollIntoView: that scrolls every scrollable
  // ancestor, the page included, and dragged the whole page sideways on a phone.
  function centerInTray(nav, b){
    try { nav.scrollLeft = b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2; } catch {}
  }
  function setActive(nav, id){
    (nav || document.getElementById('tabs')).querySelectorAll('button[data-tab]').forEach(b => {
      const on = b.dataset.tab === id;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on));
      if (on) centerInTray(b.parentElement, b);
    });
  }

  // ── what you owe, on every screen ───────────────────────────────────
  // A small card under the top bar whenever the person owes something (a floor brief,
  // a whip follow-up): how many, the first one, and a way to the To Do page. Dismissing
  // it lasts until the list of things owed changes. Called with an empty list (or on
  // the To Do page itself) it goes away.
  function showTodo(tasks, opts){
    opts = opts || {};
    let box = document.getElementById('todopop');
    const ids = (tasks || []).map(t => t.task_id).join(',');
    let dismissed = '';
    try { dismissed = sessionStorage.getItem('skywalker.todo.dismissed') || ''; } catch {}
    if (!tasks || !tasks.length || dismissed === ids){ if (box) box.remove(); return; }
    if (!box){ box = document.createElement('div'); box.id = 'todopop'; box.className = 'todopop'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    box.innerHTML = `<div class="t"><b>To Do · ${tasks.length}</b><div>${esc(tasks[0].title || '')}${tasks.length > 1 ? ` and ${tasks.length - 1} more` : ''}</div></div>
      <a class="pill on" href="${esc(opts.href || 'leadership.html#home')}">Open</a>
      <button class="tagx" aria-label="Dismiss" title="Dismiss">×</button>`;
    box.querySelector('button').onclick = () => { try { sessionStorage.setItem('skywalker.todo.dismissed', ids); } catch {} box.remove(); };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { injectSprite(); wireThemePanel(); });
  else { injectSprite(); wireThemePanel(); }

  window.Skywalker = {setTheme, setMotion, hideSplash, buildTray, setActive, showTodo, MENU, THEMES};
})();
