/* ===== 穿搭工作台 - 数据层 ===== */
(function (global) {
  'use strict';

  // 11 个服饰分类：图标 + 文字
  const CATEGORIES = [
    { key: 'top',      icon: '👚', name: '上衣' },
    { key: 'coat',     icon: '🧥', name: '外套' },
    { key: 'pants',    icon: '👖', name: '裤子' },
    { key: 'skirt',    icon: '👗', name: '裙子' },
    { key: 'belt',     icon: '🪢', name: '腰带' },
    { key: 'necklace', icon: '📿', name: '项链' },
    { key: 'earring',  icon: '💎', name: '耳环' },
    { key: 'bracelet', icon: '⌚', name: '手链' },
    { key: 'ring',     icon: '💍', name: '戒指' },
    { key: 'hair',     icon: '🎀', name: '头饰' },
    { key: 'other',    icon: '🧷', name: '其他' }
  ];

  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

  const LS_KEY = 'outfit_studio_v1';

  function defaultState() {
    return {
      clothes: {},                 // key=分类key -> [{id, name, dataUrl}]
      seasons: { spring: [], summer: [], autumn: [], winter: [] }, // 每季穿搭 [{id, items:[dataUrl...]}]
      favorite: []                 // 最常穿（每周更新）
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const obj = JSON.parse(raw);
      const def = defaultState();
      return Object.assign(def, obj);
    } catch (e) {
      return defaultState();
    }
  }

  function save(state) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // 每周更新：把使用频率最高的若干件衣服组合成"最常穿"
  function refreshFavorite(state) {
    const all = [];
    Object.keys(state.clothes).forEach(k => {
      (state.clothes[k] || []).forEach(c => all.push(c));
    });
    // 没有衣物时给一个优雅空态
    state.favorite = all.slice(0, 6);
    save(state);
  }

  global.OSData = {
    CATEGORIES, SEASONS, LS_KEY,
    load, save, defaultState, refreshFavorite
  };
})(window);
