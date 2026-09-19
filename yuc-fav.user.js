// ==UserScript==
// @name         新番收藏夹 (纯净原网页增强版 - 带关闭按钮)
// @namespace    yuc-fav
// @version      1.2
// @match        *://yuc.wiki/*
// @connect      i0.hdslb.com
// @connect      *
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    // 屏蔽网站自身的无用刷屏日志
    const origLog = console.log;
    console.log = function(...args) {
        if (typeof args[0] === 'string' && args[0].includes('未找到 ace 对象')) return;
        origLog.apply(console, args);
    };

    const m = location.pathname.match(/\/(\d{4})(\d{2})/);
    const month = m ? m[1] + '年' + Number(m[2]) + '月新番' : '其他';
    const ym = m ? Number(m[1] + m[2]) : 0;

    const load = () => GM_getValue('favs', {});
    const save = d => GM_setValue('favs', d);
    const clean = s => s.replace(/\s+/g, ' ').trim();
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const style = document.createElement('style');
    // 新增了 .yf-close 的样式
    style.textContent = `
        .yf-tab{position:fixed;right:20px;width:96px;padding:6px 0;text-align:center;font-size:12px;background:#333;color:#eee;cursor:pointer;z-index:99999;border-radius:6px;user-select:none;touch-action:none}
        .yf-panel{position:fixed;width:340px;min-width:220px;max-width:95vw;min-height:120px;max-height:90vh;resize:both;overflow:auto;background:#2b2b2b;color:#eee;font:13px sans-serif;border:1px solid #555;z-index:99999;display:none}
        .yf-head{position:sticky;top:0;z-index:1;padding:4px 8px;font-size:12px;color:#aaa;background:#222;cursor:move;user-select:none;touch-action:none}
        .yf-close{position:absolute;right:8px;top:2px;font-size:16px;cursor:pointer;color:#aaa;line-height:1;padding:0 6px;border-radius:4px}
        .yf-close:hover{color:#fff;background:#d32f2f}
        .yf-panel summary{cursor:pointer;padding:6px 8px;background:#3a3a3a}
        .yf-item{display:flex;gap:8px;padding:6px 8px;border-top:1px solid #444;align-items:flex-start}
        .yf-item img{width:calc(45px * var(--yf-s, 1));height:calc(56px * var(--yf-s, 1));object-fit:cover;flex:none;background:#444;border-radius:3px}
        .yf-info{flex:1;overflow:hidden}
        .yf-cn{font-weight:bold}
        .yf-jp,.yf-tag{color:#aaa;font-size:12px}
        .yf-day-inline{color:#ff5252;font-weight:bold;margin-right:4px}
        .yf-del{cursor:pointer;color:#c66;padding:0 4px}
        .yf-star{position:absolute;z-index:10;right:4px;top:2px;font-size:24px;line-height:1;cursor:pointer;color:#f5a623;user-select:none}
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

    // 修改：头部加入了一个关闭按钮 span.yf-close
    const head = document.createElement('div');
    head.className = 'yf-head';
    head.innerHTML = '按住这里拖动，右下角拉伸 <span class="yf-close" title="关闭面板">×</span>';
    const content = document.createElement('div');
    panel.appendChild(head);
    panel.appendChild(content);

    // 绑定关闭按钮事件
    const closeBtn = head.querySelector('.yf-close');
    closeBtn.onclick = (ev) => {
        ev.stopPropagation(); // 阻止事件冒泡
        panel.style.display = 'none'; // 隐藏面板
    };

    // ======== 拖拽与缩放控制 ========
    const pos = GM_getValue('pos', {});

    function placePanel(el, left, top) {
        el.style.left = Math.max(0, Math.min(left, innerWidth - el.offsetWidth)) + 'px';
        el.style.top = Math.max(0, Math.min(top, innerHeight - 40)) + 'px';
    }

    function savePos() {
        GM_setValue('pos', {
            tab: { top: tab.style.top }, 
            panel: { left: panel.style.left, top: panel.style.top, w: panel.style.width, h: panel.style.height }
        });
    }

    function makeTabDraggable(tabEl) {
        tabEl.onpointerdown = ev => {
            if (ev.button !== 0) return;
            const sy = ev.clientY;
            const top = parseFloat(tabEl.style.top) || Math.round(innerHeight * 0.4);
            tabEl.dragged = false;
            tabEl.setPointerCapture(ev.pointerId);
            
            tabEl.onpointermove = e => {
                if (Math.abs(e.clientY - sy) > 3) tabEl.dragged = true;
                if (tabEl.dragged) {
                    tabEl.style.top = Math.max(0, Math.min(top + e.clientY - sy, innerHeight - tabEl.offsetHeight)) + 'px';
                }
            };
            tabEl.onpointerup = () => {
                tabEl.onpointermove = null;
                tabEl.onpointerup = null;
                if (tabEl.dragged) savePos();
            };
        };
    }

    function makePanelDraggable(panelEl, handle) {
        handle.onpointerdown = ev => {
            // 修改：如果点击的是关闭按钮，不触发拖拽逻辑
            if (ev.button !== 0 || ev.target.classList.contains('yf-close')) return;
            
            const sx = ev.clientX, sy = ev.clientY;
            const left = parseFloat(panelEl.style.left), top = parseFloat(panelEl.style.top);
            handle.dragged = false;
            handle.setPointerCapture(ev.pointerId);
            handle.onpointermove = e => {
                if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 3) handle.dragged = true;
                if (handle.dragged) placePanel(panelEl, left + e.clientX - sx, top + e.clientY - sy);
            };
            handle.onpointerup = () => {
                handle.onpointermove = null;
                handle.onpointerup = null;
                if (handle.dragged) savePos();
            };
        };
    }

    const t = pos.tab || {};
    tab.style.top = t.top || Math.round(innerHeight * 0.4) + 'px';
    
    const p = pos.panel || {};
    panel.style.left = p.left || Math.max(0, innerWidth - 96 - 340 - 28) + 'px';
    panel.style.top = p.top || '60px';
    if (p.w) panel.style.width = p.w;
    if (p.h) panel.style.height = p.h;

    makeTabDraggable(tab);           
    makePanelDraggable(panel, head); 

    let timer;
    new ResizeObserver(() => {
        const r = panel.offsetWidth / 340;
        panel.style.setProperty('--yf-s', Math.min(4, Math.max(1, 1 + (r - 1) * 0.7))); 
        clearTimeout(timer);
        timer = setTimeout(savePos, 300);
    }).observe(panel);

    tab.onclick = () => {
        if (tab.dragged) return;
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        if (panel.style.display === 'block') placePanel(panel, parseFloat(panel.style.left), parseFloat(panel.style.top));
    };

    // ======== 核心：全局特征抓取 ========
    const titleSelector = 'p[class*="title_cn"], td[class*="date_title"], .title_cn_r, .title_cn';
    
    let cachedImages = [];
    let cachedDateHeaders = [];

    function initCaches() {
        cachedImages = [...document.querySelectorAll('img')].filter(img => {
            const w = img.clientWidth || parseInt(img.getAttribute('width') || '0', 10);
            return (w > 50 || img.getAttribute('width')?.includes('120')) && !coverUrl(img).includes('blank.gif');
        });
        
        cachedDateHeaders = [...document.querySelectorAll('td[class*="date"], th, .date, .date2')].filter(el => 
            /周[一二三四五六日]/.test(el.textContent)
        );
    }

    function coverUrl(img) {
        if (!img) return '';
        const list = [img.getAttribute('data-src'), img.getAttribute('data-original'), img.getAttribute('data-lazy-src'), img.currentSrc, img.src];
        const u = list.find(x => x && !x.startsWith('data:') && !x.includes('blank.gif'));
        return u ? new URL(u, location.href).href : '';
    }

    function detectAnimeCards() {
        const results = [];
        document.querySelectorAll(titleSelector).forEach(cnEl => {
            const cnText = clean(cnEl.textContent);
            if (!cnText) return;

            let box = cnEl.parentElement;
            let depth = 0;
            while (box.parentElement && depth < 5 && box.tagName !== 'TABLE' && box.tagName !== 'BODY') {
                box = box.parentElement;
                depth++;
            }
            results.push({ cnEl, box, cnText, key: month + '|' + cnText });
        });
        return results;
    }

    function extractAnimeData(entry) {
        const { cnEl, box, cnText } = entry;
        
        let cover = '';
        for (let i = cachedImages.length - 1; i >= 0; i--) {
            if (cachedImages[i].compareDocumentPosition(cnEl) & Node.DOCUMENT_POSITION_FOLLOWING) {
                cover = coverUrl(cachedImages[i]);
                break;
            }
        }

        let day = '';
        const boxText = clean(box.textContent);
        
        const wMatch = boxText.match(/\d{1,2}\/\d{1,2}\s*周([一二三四五六日])/) || 
                       boxText.match(/周([一二三四五六日])(?:深夜|晚间|下午|早间|上午|中午|凌晨)?/);
        if (wMatch) {
            day = '周' + wMatch[1];
        } else {
            for (let i = cachedDateHeaders.length - 1; i >= 0; i--) {
                if (cachedDateHeaders[i].compareDocumentPosition(cnEl) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    const match = clean(cachedDateHeaders[i].textContent).match(/周([一二三四五六日])/);
                    if (match) {
                        day = '周' + match[1];
                        break;
                    }
                }
            }
        }

        const textFrom = sel => { const el = box.querySelector(sel); return el ? clean(el.textContent) : ''; };
        const tds = box.querySelectorAll('td[class*="type"]');

        return {
            cn: cnText,
            jp: textFrom('p[class*="title_jp"]'),
            cover: cover,
            day: day,
            type: tds[0] ? clean(tds[0].textContent) : '',
            genre: tds[1] ? clean(tds[1].textContent) : '',
            month,
            ym
        };
    }

    function fetchImageAsBase64(url) {
        return new Promise((resolve) => {
            if (!url) return resolve('');
            GM_xmlhttpRequest({
                method: 'GET', url: url, responseType: 'blob',
                headers: { 'Referer': 'https://yuc.wiki/', 'User-Agent': navigator.userAgent },
                onload: (res) => {
                    if (res.status === 200) {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = () => resolve(url);
                        reader.readAsDataURL(res.response);
                    } else resolve(url);
                },
                onerror: () => resolve(url)
            });
        });
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
        list.forEach(f => { (groups[f.month] = groups[f.month] || []).push(f); });
        const months = Object.keys(groups).sort((a, b) => groups[b][0].ym - groups[a][0].ym);
        
        content.innerHTML = '<details open><summary>我想看的</summary>' + months.map(mo =>
            '<details open><summary>' + esc(mo) + ' (' + groups[mo].length + ')</summary>' +
            groups[mo].sort((a, b) => a.t - b.t).map(f =>
                '<div class="yf-item"><img referrerpolicy="no-referrer" src="' + esc(f.cover) + '">' +
                '<div class="yf-info">' +
                '<div class="yf-cn">' + (f.day ? '<span class="yf-day-inline">[' + esc(f.day) + ']</span>' : '') + esc(f.cn) + '</div>' +
                '<div class="yf-jp">' + esc(f.jp) + '</div>' +
                '<div class="yf-tag">' + esc(f.type) + (f.genre ? ' | ' + esc(f.genre) : '') + '</div></div>' +
                '<span class="yf-del" data-key="' + esc(f.month + '|' + f.cn) + '">×</span></div>'
            ).join('') + '</details>'
        ).join('') + '</details>';
    }

    function refresh() {
        const favs = load();
        entries.forEach(e => {
            if (e.star) e.star.textContent = favs[e.key] ? '★' : '☆';
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

    initCaches();
    const entries = detectAnimeCards();

    entries.forEach(e => {
        const host = e.cnEl;
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

        const star = document.createElement('span');
        star.className = 'yf-star';
        star.title = '加入我想看的';
        star.onclick = async (ev) => {
            ev.stopPropagation();
            const favs = load();
            if (favs[e.key]) {
                delete favs[e.key];
                save(favs);
                refresh();
            } else {
                star.textContent = '⏳';
                const data = extractAnimeData(e);
                const base64Cover = await fetchImageAsBase64(data.cover);
                if (base64Cover) data.cover = base64Cover;

                favs[e.key] = Object.assign(data, { t: Date.now() });
                save(favs);
                refresh();
            }
        };
        host.appendChild(star);
        e.star = star;
    });

    refresh();
})();
