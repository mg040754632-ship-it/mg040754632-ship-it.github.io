/* ===== 穿搭工作台 - 主逻辑 ===== */
(function () {
  'use strict';

  const { CATEGORIES, SEASONS, ACCESSORY_KEYS, load, save, refreshFavorite } = window.OSData;
  let state = load();

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // 页面历史栈：用于"返回键"返回上一个页面
  const history = [];
  function pushHistory(view) { history.push(view); updateBackBtn(); }
  function updateBackBtn() {
    const btn = $('#appBack');
    if (btn) btn.hidden = history.length === 0;
  }

  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 1600);
  }

  /* ---------- 底部导航 ---------- */
  function showPage(target) {
    $$('.nav-btn').forEach(b => b.classList.toggle('is-active', b.dataset.target === target));
    $$('.page').forEach(p => p.classList.toggle('is-active', p.id === target));
  }
  function initNav() {
    $$('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showPage(btn.dataset.target);
        // 底部导航视为"主页"，清空历史栈（主页之间不算返回层级）
        history.length = 0;
        updateBackBtn();
      });
    });
    // 顶部返回键：返回上一个视图
    $('#appBack').addEventListener('click', goBack);
  }

  // 统一返回：按历史栈逐层退出
  function goBack() {
    const last = history.pop();
    if (!last) { updateBackBtn(); return; }
    if (last === 'upload') { $('#uploadModal').hidden = true; }
    else if (last === 'match') {
      $('#matchView').hidden = true;
      $('#categoryPanel').hidden = true;
      $('#seasonPick').hidden = true;
      refreshFavorite(state);
      renderPlans();
    }
    else if (last === 'season') { $('#seasonPick').hidden = true; }
    else if (last === 'category') { $('#categoryPanel').hidden = true; }
    updateBackBtn();
  }

  /* ---------- 穿搭方案页 ---------- */
  function renderPlans() {
    // 最常穿
    const fav = $('#favoriteOutfit');
    fav.innerHTML = '';
    if (!state.favorite.length) {
      fav.innerHTML = '<div class="empty">还没有常用穿搭，去「个人主页」上传并搭配衣物吧～</div>';
    } else {
      state.favorite.forEach(c => {
        const el = document.createElement('div');
        el.className = 'feature-item';
        el.innerHTML = `<img src="${c.dataUrl}" alt=""><span class="tag">${c.name}</span>`;
        fav.appendChild(el);
      });
    }
    // 四季点击 -> 查看该季
    $$('.season-square').forEach(sq => {
      sq.addEventListener('click', () => openSeason(sq.dataset.season));
    });
  }

  function openSeason(season) {
    const items = state.seasons[season] || [];
    const names = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
    if (!items.length) { toast(`${names[season]}季还没有穿搭，去搭配吧`); return; }
    // 简单展示：把该季第一套穿搭铺到最常穿区域
    const fav = $('#favoriteOutfit');
    fav.innerHTML = '';
    items.forEach(outfit => {
      const wrap = document.createElement('div');
      wrap.className = 'feature-item';
      wrap.style.width = 'calc(50% - 5px)';
      const imgs = outfit.items.map(u => `<img src="${u}" style="width:48%;margin:1%">`).join('');
      wrap.innerHTML = imgs;
      fav.appendChild(wrap);
    });
    // 切到穿搭方案页
    $$('.nav-btn').forEach(b => b.classList.toggle('is-active', b.dataset.target === 'page-plans'));
    $$('.page').forEach(p => p.classList.toggle('is-active', p.id === 'page-plans'));
    toast(`查看${names[season]}季穿搭`);
  }

  /* ---------- 上传衣物 ---------- */
  function initUpload() {
    const modal = $('#uploadModal');
    const input = $('#uploadInput');
    const preview = $('#uploadPreviewWrap');
    const catSel = $('#uploadCategory');

    // 填充分类
    catSel.innerHTML = CATEGORIES.map(c => `<option value="${c.key}">${c.icon} ${c.name}</option>`).join('');

    $('#openUpload').addEventListener('click', () => { modal.hidden = false; pushHistory('upload'); });
    $('[data-close="uploadModal"]').addEventListener('click', () => { modal.hidden = true; if (history[history.length-1]==='upload') goBack(); });
    $('#uploadBack').addEventListener('click', () => { modal.hidden = true; if (history[history.length-1]==='upload') goBack(); });

    let currentDataUrl = null;
    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        // 抠图换白底（近似：去除近似纯白/纯透明边缘 + 居中）
        removeBgToWhite(ev.target.result, dataUrl => {
          currentDataUrl = dataUrl;
          preview.innerHTML = `<img src="${dataUrl}">`;
        });
      };
      reader.readAsDataURL(file);
    });

    $('#saveUpload').addEventListener('click', () => {
      if (!currentDataUrl) { toast('请先选择图片'); return; }
      const key = catSel.value;
      const cat = CATEGORIES.find(c => c.key === key);
      state.clothes[key] = state.clothes[key] || [];
      state.clothes[key].push({
        id: 'c' + Date.now(),
        name: cat.name,
        dataUrl: currentDataUrl
      });
      save(state);
      refreshFavorite(state);
      renderWardrobe();
      toast('已加入服饰库');
      modal.hidden = true;
      preview.innerHTML = '<span class="upload-hint">点击从相册选择图片</span>';
      input.value = '';
      currentDataUrl = null;
    });
  }

  // 前端近似去背景：把接近白色的像素变透明，导出为白底 PNG
  function removeBgToWhite(src, cb) {
    const img = new Image();
    img.onload = () => {
      const maxW = 600;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          // 接近白色 -> 透明（实现"抠出衣服 + 白底"的近似效果）
          if (r > 235 && g > 235 && b > 235) { d[i + 3] = 0; }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (e) { /* 跨域图片可能失败，直接返回原图 */ }
      cb(cv.toDataURL('image/png'));
    };
    img.onerror = () => cb(src);
    img.src = src;
  }

  /* ---------- 搭配衣物 ---------- */
  let matchState = { activeCat: null };

  function initMatch() {
    const view = $('#matchView');
    $('#openMatch').addEventListener('click', () => {
      view.hidden = false;
      renderCategoryList();
      renderTray();
      clearCanvas();
      pushHistory('match');
    });
    // 返回键：退出搭配页
    $('#matchBack').addEventListener('click', () => { if (history[history.length-1]==='match') goBack(); });
    $('#matchDone').addEventListener('click', () => {
      view.hidden = true;
      $('#categoryPanel').hidden = true;
      $('#seasonPick').hidden = true;
      // 清掉 match 及其子层历史
      while (history.length && history[history.length-1] !== 'match') history.pop();
      if (history[history.length-1] === 'match') history.pop();
      updateBackBtn();
      refreshFavorite(state);
      renderPlans();
    });

    // 分类侧栏
    $('#openCategory').addEventListener('click', () => { $('#categoryPanel').hidden = false; pushHistory('category'); });
    $('#closeCategory').addEventListener('click', () => { $('#categoryPanel').hidden = true; if (history[history.length-1]==='category') goBack(); });

    // 添加键 -> 选季节
    $('#matchAdd').addEventListener('click', () => {
      const placed = $$('.placed', $('#matchCanvas'));
      if (!placed.length) { toast('先把衣物拖到上方白底'); return; }
      $('#seasonPick').hidden = false;
      pushHistory('season');
    });
    $('#seasonPickCancel').addEventListener('click', () => { $('#seasonPick').hidden = true; if (history[history.length-1]==='season') goBack(); });
    $$('#seasonPick .season-pick-grid button').forEach(b => {
      b.addEventListener('click', () => {
        const season = b.dataset.season;
        const items = $$('.placed', $('#matchCanvas')).map(p => p.dataset.url);
        state.seasons[season] = state.seasons[season] || [];
        state.seasons[season].push({ id: 'o' + Date.now(), items });
        save(state);
        refreshFavorite(state);
        $('#seasonPick').hidden = true;
        if (history[history.length-1] === 'season') history.pop();
        updateBackBtn();
        clearCanvas();
        toast('已保存到' + { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }[season] + '季');
      });
    });
  }

  function renderCategoryList() {
    const ul = $('#categoryList');
    ul.innerHTML = CATEGORIES.map(c =>
      `<li data-key="${c.key}"><span class="c-icon">${c.icon}</span><span>${c.name}</span></li>`
    ).join('');
    $$('#categoryList li').forEach(li => {
      li.addEventListener('click', () => {
        matchState.activeCat = li.dataset.key;
        $$('#categoryList li').forEach(x => x.classList.toggle('active', x === li));
        renderTray();
      });
    });
  }

  function renderTray() {
    const tray = $('#matchTray');
    tray.innerHTML = '';
    const list = matchState.activeCat ? (state.clothes[matchState.activeCat] || []) : [];
    if (!list.length) {
      tray.innerHTML = '<div style="grid-column:1/-1;color:var(--ink-soft);font-size:13px;padding:20px;text-align:center">该分类暂无衣物，先去上传</div>';
      return;
    }
    list.forEach(c => {
      const el = document.createElement('div');
      el.className = 'tray-item';
      el.innerHTML = `<img src="${c.dataUrl}" alt=""><button class="del">✕</button>`;
      // 双击 -> 显示删除键
      el.addEventListener('dblclick', () => {
        el.classList.toggle('show-del');
      });
      // 删除
      el.querySelector('.del').addEventListener('click', e => {
        e.stopPropagation();
        state.clothes[matchState.activeCat] = state.clothes[matchState.activeCat].filter(x => x.id !== c.id);
        save(state);
        renderTray();
        renderWardrobe();
        toast('已删除');
      });
      // 点击/拖拽到画布
      el.addEventListener('click', () => placeOnCanvas(c.dataUrl));
      tray.appendChild(el);
    });
  }

  function clearCanvas() {
    $('#matchCanvas').innerHTML = '';
  }

  function placeOnCanvas(url) {
    const canvas = $('#matchCanvas');
    const el = document.createElement('div');
    el.className = 'placed';
    el.dataset.url = url;
    el.style.left = (20 + Math.random() * 40) + 'px';
    el.style.top = (20 + Math.random() * 40) + 'px';
    el.innerHTML = `<img src="${url}">`;
    makeDraggable(el, canvas);
    canvas.appendChild(el);
  }

  function makeDraggable(el, container) {
    let sx, sy, ox, oy, dragging = false;
    const down = (x, y) => {
      dragging = true;
      sx = x; sy = y;
      ox = parseFloat(el.style.left) || 0;
      oy = parseFloat(el.style.top) || 0;
      el.style.cursor = 'grabbing';
    };
    const move = (x, y) => {
      if (!dragging) return;
      el.style.left = (ox + x - sx) + 'px';
      el.style.top = (oy + y - sy) + 'px';
    };
    const up = () => { dragging = false; el.style.cursor = 'grab'; };

    el.addEventListener('mousedown', e => down(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', up);
    el.addEventListener('touchstart', e => down(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    el.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    el.addEventListener('touchend', up);
  }

  /* ---------- 个人主页：服饰库数量 ---------- */
  function renderWardrobe() {
    const grid = $('#wardrobeGrid');
    if (!grid) return;
    grid.innerHTML = CATEGORIES.map(c => {
      const n = (state.clothes[c.key] || []).length;
      return `<div class="wardrobe-cell${n ? '' : ' empty'}">
        <span class="w-icon">${c.icon}</span>
        <span class="w-name">${c.name}</span>
        <span class="w-count">${n}</span>
      </div>`;
    }).join('');
  }

  /* ---------- 启动 ---------- */
  function init() {
    refreshFavorite(state);
    initNav();
    renderPlans();
    renderWardrobe();
    initUpload();
    initMatch();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
