/* ===== 穿搭工作台 - 主逻辑 ===== */
(function () {
  'use strict';

  const { CATEGORIES, SEASONS, load, save, refreshFavorite, persistAvailable } = window.OSData;
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
    else if (last === 'season-detail') {
      // 顶部返回键：回到穿搭方案页
      $$('.nav-btn').forEach(b => b.classList.toggle('is-active', b.dataset.target === 'page-plans'));
      $$('.page').forEach(p => p.classList.toggle('is-active', p.id === 'page-plans'));
    }
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
    // 四季点击 -> 进入该季详情页
    $$('.season-square').forEach(sq => {
      sq.addEventListener('click', () => openSeason(sq.dataset.season));
    });
  }

  const SEASON_META = {
    spring: { emoji: '🌸', name: '春' },
    summer: { emoji: '☀️', name: '夏' },
    autumn: { emoji: '🍂', name: '秋' },
    winter: { emoji: '❄️', name: '冬' }
  };

  // 进入季节详情页（独立的展示页）
  function openSeason(season) {
    const meta = SEASON_META[season];
    $('#seasonDetailTitle').textContent = `${meta.emoji} ${meta.name}`;
    $('#seasonDetailTitle').dataset.season = season;
    renderSeasonDetail(season);
    // 切换到季节详情页
    $$('.nav-btn').forEach(b => b.classList.remove('is-active'));
    $$('.page').forEach(p => p.classList.toggle('is-active', p.id === 'page-season'));
    pushHistory('season-detail');
  }

  // 渲染某季的搭配方案列表（持久化数据）
  function renderSeasonDetail(season) {
    const grid = $('#seasonDetailGrid');
    if (!grid) return;
    const items = state.seasons[season] || [];
    grid.innerHTML = '';
    if (!items.length) {
      grid.innerHTML = '<div class="season-empty">该季节还没有穿搭方案，去「个人主页」搭配并保存吧～</div>';
      return;
    }
    items.forEach(outfit => {
      const card = document.createElement('div');
      card.className = 'outfit-card';
      const imgs = outfit.items.map(u => `<img src="${u}" alt="">`).join('');
      card.innerHTML = `
        <div class="outfit-imgs">${imgs}</div>
        <button class="outfit-del" data-id="${outfit.id}" title="删除该方案">✕</button>
      `;
      card.querySelector('.outfit-del').addEventListener('click', e => {
        e.stopPropagation();
        state.seasons[season] = state.seasons[season].filter(o => o.id !== outfit.id);
        save(state);
        refreshFavorite(state);
        renderSeasonDetail(season);
        renderPlans();
        toast('已删除该穿搭方案');
      });
      grid.appendChild(card);
    });
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
        // 直接使用原图，不再做去背景/换白底处理
        currentDataUrl = ev.target.result;
        preview.innerHTML = `<img src="${currentDataUrl}">`;
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

  // 前端去背景函数已移除（需求：不再对上传衣物做换白底处理）

  /* ---------- 搭配衣物 ---------- */
  let matchState = { activeCat: null, currentSeason: null };

  // 把当前画布上的搭配保存到指定季节（持久化到 localStorage）
  function saveCurrentMatch(season) {
    const items = $$('.placed', $('#matchCanvas')).map(p => p.dataset.url);
    if (!items.length) { toast('先把衣物拖到上方白底'); return false; }
    state.seasons[season] = state.seasons[season] || [];
    state.seasons[season].push({ id: 'o' + Date.now(), items });
    save(state);                       // 写入 localStorage，刷新/重进不丢失

    // 回读验证：确认数据确实落盘（移动端隐私模式/存储限制会静默失败）
    const saved = (() => {
      try {
        const raw = localStorage.getItem('outfit_studio_v1_seasons') || sessionStorage.getItem('outfit_studio_v1_seasons');
        if (!raw) return false;
        const obj = JSON.parse(raw);
        return (obj[season] || []).length > 0;
      } catch (e) { return false; }
    })();
    if (!persistAvailable() || !saved) {
      toast('⚠️ 保存失败：浏览器禁用了本地存储\n请关闭无痕/隐私模式后重试');
      // 仍把这条加进内存里的 state，本次会话可见，但刷新会丢
    } else {
      toast('已保存到' + seasonName(season) + '季 ✓');
    }
    refreshFavorite(state);
    renderSeasonDetail(season);        // 同步刷新季节详情页
    return true;
  }

  function closeMatch() {
    const view = $('#matchView');
    view.hidden = true;
    $('#categoryPanel').hidden = true;
    $('#seasonPick').hidden = true;
    matchState.currentSeason = null;
    // 清掉 match 及其子层历史
    while (history.length && history[history.length-1] !== 'match') history.pop();
    if (history[history.length-1] === 'match') history.pop();
    updateBackBtn();
    refreshFavorite(state);
    renderPlans();
  }

  function initMatch() {
    const view = $('#matchView');
    $('#openMatch').addEventListener('click', () => {
      view.hidden = false;
      matchState.currentSeason = null;
      resetZoom();
      renderCategoryList();
      renderTray();
      clearCanvas();
      pushHistory('match');
    });
    // 返回键：退出搭配页
    $('#matchBack').addEventListener('click', () => { if (history[history.length-1]==='match') goBack(); });
    $('#matchDone').addEventListener('click', () => {
      // 完成：若已选定季节则直接保存并退出；否则先弹出季节选择
      if (matchState.currentSeason) {
        if (saveCurrentMatch(matchState.currentSeason)) {
          clearCanvas();
          closeMatch();
        }
      } else {
        const placed = $$('.placed', $('#matchCanvas'));
        if (!placed.length) { toast('先把衣物拖到上方白底'); return; }
        $('#seasonPick').hidden = false;
        pushHistory('season');
      }
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
        matchState.currentSeason = season;   // 记录所选季节，供"完成"键复用
        if (saveCurrentMatch(season)) {
          $('#seasonPick').hidden = true;
          if (history[history.length-1] === 'season') history.pop();
          updateBackBtn();
          clearCanvas();
        }
      });
    });
  }

  function seasonName(s) { return { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }[s]; }

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
        $('#categoryPanel').hidden = true;   // 选完分类自动收起侧栏，方便直接拖拽
        if (history[history.length-1] === 'category') goBack();
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

  // 当前画布缩放比例（整体缩放，作用于画布内所有衣物）
  let canvasScale = 1;
  function applyCanvasScale() {
    $('#matchCanvas').style.transform = `scale(${canvasScale})`;
    $('#matchCanvas').style.transformOrigin = 'top left';
    const label = $('#zoomLabel');
    if (label) label.textContent = Math.round(canvasScale * 100) + '%';
  }
  function setZoom(v) {
    canvasScale = Math.min(2.5, Math.max(0.4, v));
    applyCanvasScale();
  }
  function resetZoom() { canvasScale = 1; applyCanvasScale(); }

  // 单个衣物缩放（双击画布内衣物放大/缩小，或选中后用滚轮）
  function scalePlaced(el, factor) {
    let s = parseFloat(el.dataset.scale || '1');
    s = Math.min(3, Math.max(0.3, s * factor));
    el.dataset.scale = s;
    el.style.width = (90 * s) + 'px';
  }

  function placeOnCanvas(url) {
    const canvas = $('#matchCanvas');
    const el = document.createElement('div');
    el.className = 'placed';
    el.dataset.url = url;
    el.dataset.scale = '1';
    el.style.left = (20 + Math.random() * 40) + 'px';
    el.style.top = (20 + Math.random() * 40) + 'px';
    el.innerHTML = `<img src="${url}">`;
    makeDraggable(el, canvas);
    canvas.appendChild(el);
  }

  function makeDraggable(el, container) {
    let sx, sy, ox, oy, dragging = false;
    let pinchStart = 0, pinchScale = 1, pinching = false;

    const down = (x, y) => {
      if (pinching) return;
      dragging = true;
      sx = x; sy = y;
      ox = parseFloat(el.style.left) || 0;
      oy = parseFloat(el.style.top) || 0;
      el.style.cursor = 'grabbing';
      el.classList.add('selected');
      $$('.placed', container).forEach(p => { if (p !== el) p.classList.remove('selected'); });
    };
    const move = (x, y) => {
      if (!dragging || pinching) return;
      el.style.left = (ox + x - sx) + 'px';
      el.style.top = (oy + y - sy) + 'px';
    };
    const up = () => { dragging = false; el.style.cursor = 'grab'; };

    // 滚轮缩放选中的衣物（桌面）
    el.addEventListener('wheel', e => {
      e.preventDefault();
      $$('.placed', container).forEach(p => p.classList.remove('selected'));
      el.classList.add('selected');
      scalePlaced(el, e.deltaY < 0 ? 1.1 : 0.9);
    }, { passive: false });

    el.addEventListener('mousedown', e => down(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', up);

    // === 触摸：拖动 + 双指捏合缩放（移动端核心） ===
    el.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinching = true; dragging = false;
        pinchStart = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchScale = parseFloat(el.dataset.scale || '1');
        e.preventDefault();
      } else if (e.touches.length === 1) {
        pinching = false;
        down(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();   // 阻止页面滚动，保证拖动生效
      }
    }, { passive: false });

    el.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinchStart) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const s = Math.min(3, Math.max(0.3, pinchScale * (d / pinchStart)));
        el.dataset.scale = s.toFixed(3);
        el.style.width = (90 * s) + 'px';
        e.preventDefault();
      } else if (e.touches.length === 1) {
        move(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    }, { passive: false });

    el.addEventListener('touchend', e => {
      if (e.touches.length === 0) { pinching = false; dragging = false; }
      up();
    });
    el.addEventListener('touchcancel', () => { pinching = false; dragging = false; });
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
    initSeasonDetail();
    initZoom();
  }

  // 季节详情页：返回键 + 渲染
  function initSeasonDetail() {
    $('#seasonDetailBack').addEventListener('click', () => {
      // 返回到穿搭方案页（上一页）
      $$('.nav-btn').forEach(b => b.classList.toggle('is-active', b.dataset.target === 'page-plans'));
      $$('.page').forEach(p => p.classList.toggle('is-active', p.id === 'page-plans'));
      // 清掉 season-detail 历史
      if (history[history.length-1] === 'season-detail') history.pop();
      updateBackBtn();
    });
  }

  // 画布整体缩放：按钮 + 滚轮
  function initZoom() {
    $('#zoomIn').addEventListener('click', () => setZoom(canvasScale + 0.2));
    $('#zoomOut').addEventListener('click', () => setZoom(canvasScale - 0.2));
    $('#zoomReset').addEventListener('click', resetZoom);
    const canvas = $('#matchCanvas');
    // 在画布空白处滚轮 = 整体缩放
    canvas.addEventListener('wheel', e => {
      if (e.target === canvas || e.target.classList.contains('placed') === false) {
        if (e.target === canvas) {
          e.preventDefault();
          setZoom(canvasScale + (e.deltaY < 0 ? 0.1 : -0.1));
        }
      }
    }, { passive: false });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
