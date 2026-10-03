/* ============================================================
   LifeQuest RPG — util.js
   Small dependency-free helper functions shared across modules.
   No DOM access here — safe to run in Node for testing too.
   ============================================================ */
(function (global) {
  'use strict';

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /** 'YYYY-MM-DD' for a given Date (local time), defaults to now. */
  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** Today's date key, local time. */
  function todayKey() {
    return dateKey(new Date());
  }

  /** Parse a 'YYYY-MM-DD' key back into a Date (local midnight). */
  function parseDateKey(key) {
    var parts = key.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  /** Whole-day difference between two 'YYYY-MM-DD' keys (b - a), in days. */
  function dayDiff(aKey, bKey) {
    var a = parseDateKey(aKey);
    var b = parseDateKey(bKey);
    var ms = b.getTime() - a.getTime();
    return Math.round(ms / 86400000);
  }

  /** ISO-ish week key, e.g. '2024-W07', used to bucket weekly quests. */
  function getWeekKey(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return d.getUTCFullYear() + '-W' + pad2(weekNo);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function pct(value, max) {
    if (!max) return 0;
    return clamp(Math.round((value / max) * 100), 0, 100);
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Human readable 'time ago' for timestamps / ISO strings. */
  function timeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var sec = Math.floor(diff / 1000);
    if (sec < 60) return 'только что';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + ' мин назад';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + ' ч назад';
    var day = Math.floor(hr / 24);
    if (day < 7) return day + ' дн назад';
    return new Date(iso).toLocaleDateString();
  }

  function monthLabel(year, month) {
    var names = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return names[month] + ' ' + year;
  }

  var Util = {
    pad2: pad2,
    dateKey: dateKey,
    todayKey: todayKey,
    parseDateKey: parseDateKey,
    dayDiff: dayDiff,
    getWeekKey: getWeekKey,
    clamp: clamp,
    uid: uid,
    pct: pct,
    deepClone: deepClone,
    escapeHtml: escapeHtml,
    timeAgo: timeAgo,
    monthLabel: monthLabel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Util;
  }
  global.LQ = global.LQ || {};
  global.LQ.Util = Util;
})(typeof window !== 'undefined' ? window : global);
