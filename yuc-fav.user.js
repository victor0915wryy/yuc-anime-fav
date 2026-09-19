// ==UserScript==
// @name         新番收藏夹
// @namespace    yuc-fav
// @version      0.1
// @match        *://yuc.wiki/2*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  const m = location.pathname.match(/\/(\d{4})(\d{2})/);
  const month = m ? m[1] + '年' + Number(m[2]) + '月新番' : '其他';
  const ym = m ? Number(m[1] + m[2]) : 0;

  const load = () => GM_getValue('favs', {});
  const save = d => GM_setValue('favs', d);
  const clean = s => s.replace(/\s+/g, ' ').trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const style = document.createElement('style');
  style.textContent = `
    .yf-tab{position:fixed;width:96px;padding:6px 0;text-align:center;font-size:12px;background:#333;color:#eee;cursor:pointer;z-index:99999;border-radius:6px;user-select:none;touch-action:none}
    .yf-panel{position:fixed;width:340px;min-width:220px;max-width:95vw;min-height:120px;max-height:90vh;resize:both;overflow:auto;background:#2b2b2b;color:#eee;font:13px sans-serif;border:1px solid #555;z-index:99999;display:none}
    .yf-head{position:sticky;top:0;z-index:1;padding:4px 8px;font-size:12px;color:#aaa;background:#222;cursor:move;user-select:none;touch-action:none}
    .yf-panel summary{cursor:pointer;padding:6px 8px;background:#3a3a3a}
    .yf-item{display:flex;gap:8px;padding:6px 8px;border-top:1px solid #444;align-items:flex-start}
    .yf-item img{width:calc(45px * var(--yf-s, 1));height:calc(56px * var(--yf-s, 1));object-fit:cover;flex:none}
    .yf-info{flex:1}
    .yf-cn{font-weight:bold}
    .yf-jp,.yf-tag{color:#aaa;font-size:12px}
    .yf-del{cursor:pointer;color:#c66;padding:0 4px}
    .yf-star{position:absolute;z-index:1;right:6px;top:4px;font-size:24px;line-height:1;cursor:pointer;color:#f5a623;user-select:none}
    .yf-day{position:absolute;left:0;top:0;padding:0 8px;background:#ce0000;color:#fff;font-size:14px;line-height:24px;border-radius:4px;white-space:nowrap;z-index:1;user-select:none}
  `;
  document.head.appendChild(style);

  const tab = document.createElement('div');
  tab.className = 'yf-tab';
  tab.innerHTML = '我想看的新番 <span></span>';
  const count = tab.querySelector('span');
  const panel = document.createElement('div');
  panel.className = 'yf-panel';
  document.body.appendChild(tab);
  document.body.appendChild(panel);

  const head = document.createElement('div');
  head.className = 'yf-head';
  head.textContent = '按住这里拖动，右下角拉伸';
  const content = document.createElement('div');
  panel.appendChild(head);
  panel.appendChild(content);

  const pos = GM_getValue('pos', {});

  function place(el, left, top) {
    el.style.left = Math.max(0, Math.min(left, innerWidth - el.offsetWidth)) + 'px';
    el.style.top = Math.max(0, Math.min(top, innerHeight - 40)) + 'px';
  }

  function savePos() {
    GM_setValue('pos', {
      tab: { left: tab.style.left, top: tab.style.top },
      panel: { left: panel.style.left, top: panel.style.top, w: panel.style.width, h: panel.style.height }
    });
  }

  function makeDraggable(el, handle) {
    handle.onpointerdown = ev => {
      if (ev.button !== 0) return;
      const sx = ev.clientX;
      const sy = ev.clientY;
      const left = parseFloat(el.style.left);
      const top = parseFloat(el.style.top);
      handle.dragged = false;
      handle.setPointerCapture(ev.pointerId);
      handle.onpointermove = e => {
        if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 3) handle.dragged = true;
        if (handle.dragged) place(el, left + e.clientX - sx, top + e.clientY - sy);
      };
      handle.onpointerup = () => {
        handle.onpointermove = null;
        handle.onpointerup = null;
        if (handle.dragged) savePos();
      };
    };
  }

  const t = pos.tab || {};
  tab.style.left = t.left || (innerWidth - 96) + 'px';
  tab.style.top = t.top || Math.round(innerHeight * 0.4) + 'px';
  place(tab, parseFloat(tab.style.left), parseFloat(tab.style.top));
  const p = pos.panel || {};
  panel.style.left = p.left || Math.max(0, innerWidth - 96 - 340 - 8) + 'px';
  panel.style.top = p.top || '60px';
  if (p.w) panel.style.width = p.w;
  if (p.h) panel.style.height = p.h;

  makeDraggable(tab, tab);
  makeDraggable(panel, head);

  let timer;
  new ResizeObserver(() => {
    const r = panel.offsetWidth / 340;
    panel.style.setProperty('--yf-s', Math.min(4, Math.max(1, 1 + (r - 1) * 0.7)));
    clearTimeout(timer);
    timer = setTimeout(savePos, 300);
  }).observe(panel);

  tab.onclick = () => {
    if (tab.dragged) return;
    if (panel.style.display === 'block') {
      panel.style.display = 'none';
    } else {
      panel.style.display = 'block';
      place(panel, parseFloat(panel.style.left), parseFloat(panel.style.top));
    }
  };

  const entries = [...document.querySelectorAll('p[class*="title_cn"]')].map(cn => {
    let box = cn.parentElement;
    while (box.parentElement && box.parentElement.querySelectorAll('p[class*="title_cn"]').length === 1) {
      box = box.parentElement;
    }
    return { cn, box };
  });

  function coverUrl(img) {
    const list = [img.currentSrc, img.src, img.getAttribute('data-src'), img.getAttribute('data-original')];
    const u = list.find(x => x && !x.startsWith('data:'));
    return u ? new URL(u, location.href).href : '';
  }

  function getWeekday(box) {
    const text = clean(box.textContent);
    const w = text.match(/\d{1,2}\/\d{1,2}\s*周([一二三四五六日])/) || text.match(/周([一二三四五六日])(?:深夜|晚间|下午|早间|上午|中午|凌晨)/);
    return w ? '周' + w[1] : '';
  }

  function getData(box) {
    const text = sel => {
      const e = box.querySelector(sel);
      return e ? clean(e.textContent) : '';
    };
    const title = box.querySelector('p[class*="title_cn"]');
    const img = [...document.querySelectorAll('img')].filter(i => i.clientWidth > 100 && i.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
    const tds = box.querySelectorAll('td[class*="type"]');
    return {
      cn: text('p[class*="title_cn"]'),
      jp: text('p[class*="title_jp"]'),
      cover: img ? coverUrl(img) : '',
      type: tds[0] ? clean(tds[0].textContent) : '',
      genre: tds[1] ? clean(tds[1].textContent) : '',
      month,
      ym
    };
  }

  function render() {
    const favs = load();
    const list = Object.values(favs);
    count.textContent = list.length;
    if (!list.length) {
      content.innerHTML = '<p style="padding:10px">还没有收藏，点标题栏右边的 ☆ 加入</p>';
      return;
    }
    const groups = {};
    list.forEach(f => {
      (groups[f.month] = groups[f.month] || []).push(f);
    });
    const months = Object.keys(groups).sort((a, b) => groups[b][0].ym - groups[a][0].ym);
    content.innerHTML = '<details open><summary>我想看的</summary>' + months.map(mo =>
      '<details open><summary>' + esc(mo) + ' (' + groups[mo].length + ')</summary>' +
      groups[mo].sort((a, b) => a.t - b.t).map(f =>
        '<div class="yf-item"><img referrerpolicy="no-referrer" src="' + esc(f.cover) + '">' +
        '<div class="yf-info"><div class="yf-cn">' + esc(f.cn) + '</div>' +
        '<div class="yf-jp">' + esc(f.jp) + '</div>' +
        '<div class="yf-tag">' + esc(f.type) + ' | ' + esc(f.genre) + '</div></div>' +
        '<span class="yf-del" data-key="' + esc(f.month + '|' + f.cn) + '">×</span></div>'
      ).join('') + '</details>'
    ).join('') + '</details>';
  }

  function refresh() {
    const favs = load();
    entries.forEach(e => {
      e.star.textContent = favs[e.key] ? '★' : '☆';
    });
    render();
  }

  panel.onclick = ev => {
    const k = ev.target.dataset.key;
    if (!k) return;
    const favs = load();
    delete favs[k];
    save(favs);
    refresh();
  };

  entries.forEach(e => {
    e.key = month + '|' + clean(e.cn.textContent);
    const host = e.cn.parentElement;
    host.style.position = 'relative';
    const star = document.createElement('span');
    star.className = 'yf-star';
    star.title = '加入我想看的';
    star.onclick = () => {
      const favs = load();
      if (favs[e.key]) {
        delete favs[e.key];
      } else {
        favs[e.key] = Object.assign(getData(e.box), { t: Date.now() });
      }
      save(favs);
      refresh();
    };
    host.appendChild(star);
    e.star = star;

    const day = getWeekday(e.box);
    if (day) {
      const badge = document.createElement('span');
      badge.className = 'yf-day';
      badge.textContent = day;
      host.appendChild(badge);
      e.badge = badge;
    }
  });

  function placeBadges() {
    entries.forEach(e => {
      if (!e.badge) return;
      const range = document.createRange();
      range.selectNodeContents(e.cn);
      const rects = range.getClientRects();
      if (!rects.length) return;
      const last = rects[rects.length - 1];
      const host = e.cn.parentElement.getBoundingClientRect();
      e.badge.style.left = (last.right - host.left + 8) + 'px';
      e.badge.style.top = (last.top - host.top + (last.height - e.badge.offsetHeight) / 2) + 'px';
    });
  }

  placeBadges();
  window.addEventListener('load', placeBadges);
  window.addEventListener('resize', placeBadges);
  document.fonts.ready.then(placeBadges);

  refresh();
})();
