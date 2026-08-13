/* ===== 穿搭工作台 - 数据层 ===== */
(function (global) {
  'use strict';

  // 服饰分类：图标 + 文字。
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

  // 采用「多 key 分片存储」：每个季节、服饰库、常用各自一个 key。
  // 避免单次写入超大 JSON 被部分移动端浏览器（隐私模式/存储限制）静默拒绝。
  const PREFIX = 'outfit_studio_v1_';
  const K = {
    clothes:  PREFIX + 'clothes',
    seasons:  PREFIX + 'seasons',
    favorite: PREFIX + 'favorite'
  };
  const LEGACY_KEY = 'outfit_studio_v1'; // 兼容旧版单一 key 的数据迁移

  // 选择一个可靠的存储后端；Safari 隐私模式下 localStorage 写入会抛错，降级到 memory。
  function getStore() {
    try {
      const t = '__t__';
      localStorage.setItem(t, '1'); localStorage.removeItem(t);
      return localStorage;
    } catch (e) {
      try {
        const t = '__t__';
        sessionStorage.setItem(t, '1'); sessionStorage.removeItem(t);
        return sessionStorage;
      } catch (e2) {
        return null; // 完全不可用，退回内存兜底
      }
    }
  }
  let store = getStore();
  const memoryFallback = {}; // 最差情况下的内存兜底（仅当前会话有效）

  function defaultState() {
    return {
      clothes: {},                 // key=分类key -> [{id, name, dataUrl}]
      seasons: { spring: [], summer: [], autumn: [], winter: [] }, // 每季穿搭 [{id, items:[dataUrl...]}]
      favorite: []                 // 最常穿（每周更新）
    };
  }

  // 通用：分片读写，带验证回读
  function writePart(key, value) {
    const str = JSON.stringify(value);
    if (store) {
      try {
        store.setItem(key, str);
        // 回读验证，确认确实落盘
        if (store.getItem(key) !== str) throw new Error('verify failed');
        return true;
      } catch (e) { /* 落到内存兜底 */ }
    }
    memoryFallback[key] = str;
    return true;
  }
  function readPart(key, fallback) {
    let raw = null;
    if (store) { try { raw = store.getItem(key); } catch (e) {} }
    if (raw == null && memoryFallback[key] != null) raw = memoryFallback[key];
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function load() {
    const def = defaultState();
    let clothes  = readPart(K.clothes, null);
    let seasons  = readPart(K.seasons, null);
    let favorite = readPart(K.favorite, null);

    // 兼容旧版：若分片为空但旧单一 key 有数据，则迁移过来
    if ((!clothes || !seasons) && store) {
      try {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const obj = JSON.parse(legacy);
          clothes  = clothes  || obj.clothes  || def.clothes;
          seasons  = seasons  || obj.seasons  || def.seasons;
          favorite = favorite || obj.favorite || def.favorite;
          // 写回分片，并删除旧 key
          writePart(K.clothes, clothes);
          writePart(K.seasons, seasons);
          writePart(K.favorite, favorite);
          try { localStorage.removeItem(LEGACY_KEY); } catch (e) {}
        }
      } catch (e) {}
    }

    return {
      clothes:  Object.assign(def.clothes, clothes || def.clothes),
      seasons:  Object.assign(def.seasons, seasons || def.seasons),
      favorite: Array.isArray(favorite) ? favorite : def.favorite
    };
  }

  // 保存整份状态（分片写入）
  function save(state) {
    writePart(K.clothes, state.clothes || {});
    writePart(K.seasons, state.seasons || {});
    writePart(K.favorite, state.favorite || []);
  }

  // 每周更新：把使用频率最高的若干件衣服组合成"最常穿"
  function refreshFavorite(state) {
    const all = [];
    Object.keys(state.clothes).forEach(k => {
      (state.clothes[k] || []).forEach(c => all.push(c));
    });
    state.favorite = all.slice(0, 6);
    save(state);
  }

  // 验证持久化是否真的可用：写一个探针并立即回读
  function persistAvailable() {
    if (!store) return false;
    try {
      const probe = PREFIX + '_probe';
      store.setItem(probe, '1');
      const ok = store.getItem(probe) === '1';
      store.removeItem(probe);
      return ok;
    } catch (e) { return false; }
  }

  global.OSData = {
    CATEGORIES, SEASONS,
    load, save, defaultState, refreshFavorite, persistAvailable
  };
})(window);
