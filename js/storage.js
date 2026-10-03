/* ============================================================
   LifeQuest RPG — storage.js
   Thin persistence layer. Everything funnels through this module
   so the backend can later be swapped for Supabase (or anything
   else) without touching game logic in state.js.
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'lifequest_rpg_save_v1';
  var memoryFallback = null; // used if localStorage is unavailable (e.g. privacy mode)

  function hasLocalStorage() {
    try {
      var t = '__lq_test__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  var USE_LS = (typeof window !== 'undefined') && hasLocalStorage();

  function load() {
    try {
      var raw = USE_LS ? window.localStorage.getItem(KEY) : memoryFallback;
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('LifeQuest: failed to load save data', e);
      return null;
    }
  }

  function save(state) {
    try {
      var json = JSON.stringify(state, function (key, value) {
        if (key === '_events') return undefined; // transient, not persisted
        return value;
      });
      if (USE_LS) {
        window.localStorage.setItem(KEY, json);
      } else {
        memoryFallback = json;
      }
      return true;
    } catch (e) {
      console.warn('LifeQuest: failed to save game', e);
      return false;
    }
  }

  function clear() {
    try {
      if (USE_LS) window.localStorage.removeItem(KEY);
      memoryFallback = null;
    } catch (e) { /* ignore */ }
  }

  function exportJSON(state) {
    return JSON.stringify(state, function (key, value) {
      if (key === '_events') return undefined;
      return value;
    }, 2);
  }

  function importJSON(text) {
    var parsed = JSON.parse(text);
    if (!parsed || !parsed.character) throw new Error('Invalid save file');
    return parsed;
  }

  var Storage = {
    load: load,
    save: save,
    clear: clear,
    exportJSON: exportJSON,
    importJSON: importJSON,
    isPersistent: function () { return USE_LS; }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
  }
  global.LQ = global.LQ || {};
  global.LQ.Storage = Storage;
})(typeof window !== 'undefined' ? window : global);
