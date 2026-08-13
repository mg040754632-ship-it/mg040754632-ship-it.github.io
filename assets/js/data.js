/* ===== 穿搭工作台 - 数据层 =====
 * 持久化策略（按可靠性排序，自动降级）：
 *   1. IndexedDB  —— 所有现代移动端浏览器均支持，且不受"禁用本地存储"限制，刷新后保留
 *   2. localStorage —— 兜底
 *   3. 内存       —— 仅当前会话（极端情况下）
 * 对外仍是同步 API：load() 返回当前内存 state，save() 同步落内存并异步持久化。
 */
(function (global) {
  'use strict';

  const CATEGORIES = [
    { key: 'top',      icon: '👚', name: '上衣' },
    { key: 'coat',     icon: '🧥', name: '外套' },
    { key: 'pants',    icon: '👖', name: '裤子' },
    { key: 'skirt',    icon: '👗', name: '裙子' },
    { key: 'belt',     icon: '🪢', name: '腰带' },
    { key: 'necklace', icon: '📿', name: '项链' },
    { key: 'earring',  icon: '💎', name: '耳环' },
    { key: 'bracelet', icon: '⌚', name: '手链' },
    { key: 'bangle',   icon: '📿', name: '手环' },
    { key: 'ring',     icon: '💍', name: '戒指' },
    { key: 'hair',     icon: '🎀', name: '头饰' },
    { key: 'bag',      icon: '👜', name: '包包' },
    { key: 'other',    icon: '🧷', name: '其他' }
  ];
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  const DB_NAME = 'outfit_studio';
  const STORE = 'state';
  const LS_KEY = 'outfit_studio_v1';

  function defaultState() {
    return {
      clothes: {},
      seasons: { spring: [], summer: [], autumn: [], winter: [] },
      favorite: []
    };
  }

  // 内存中的最新状态（同步可读）
  let mem = defaultState();
  let db = null;

  /* ---------- IndexedDB ---------- */
  function openDB() {
    return new Promise((resolve) => {
      if (!('indexedDB' in global)) return resolve(null);
      let req;
      try { req = indexedDB.open(DB_NAME, 1); }
      catch (e) { return resolve(null); }
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  function idbGet(key) {
    return new Promise((resolve) => {
      if (!db) return resolve(null);
      try {
        const tx = db.transaction(STORE, 'readonly');
        const r = tx.objectStore(STORE).get(key);
        r.onsuccess = () => resolve(r.result ?? null);
        r.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  }
  function idbSet(key, value) {
    return new Promise((resolve) => {
      if (!db) return resolve(false);
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) { resolve(false); }
    });
  }

  /* ---------- localStorage 兜底（不依赖"本地存储"开关的普通写入） ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  /* ---------- 持久化：IndexedDB 优先，localStorage 兜底 ---------- */
  function persist() {
    const str = JSON.stringify(mem);
    // 异步写 IndexedDB（主）
    idbSet(LS_KEY, str);
    // 同步写 localStorage（兜底）
    lsSet(LS_KEY, str);
  }

  function load() { return mem; }

  function save(state) {
    mem = state;
    persist();
  }

  // 把已加载的持久化数据合并进内存
  function mergeFrom(raw) {
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      const def = defaultState();
      mem = {
        clothes:  Object.assign(def.clothes, obj.clothes || {}),
        seasons:  Object.assign(def.seasons, obj.seasons || {}),
        favorite: Array.isArray(obj.favorite) ? obj.favorite : def.favorite
      };
    } catch (e) {}
  }

  /* ---------- 初始化：异步预热 IndexedDB + 兼容旧 localStorage ---------- */
  function init(onReady) {
    openDB().then(async (database) => {
      db = database;
      // 优先读 IndexedDB
      let raw = await idbGet(LS_KEY);
      // 兼容旧版：IndexedDB 为空时读旧 localStorage
      if (raw == null) {
        raw = lsGet(LS_KEY);
        if (raw != null && db) { await idbSet(LS_KEY, raw); } // 迁移到 IDB
      }
      mergeFrom(raw);
      if (onReady) onReady(mem);
    });
  }

  // 每周更新：把衣物组合成"最常穿"
  function refreshFavorite(state) {
    const all = [];
    Object.keys(state.clothes).forEach(k => {
      (state.clothes[k] || []).forEach(c => all.push(c));
    });
    state.favorite = all.slice(0, 6);
    save(state);
  }

  global.OSData = {
    CATEGORIES, SEASONS,
    init, load, save, defaultState, refreshFavorite
  };
})(window);
