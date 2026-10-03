/* ============================================================
   LifeQuest RPG — modals.js
   Modal dialog rendering (achievements, calendar, stats,
   settings, add-quest form, boss/dungeon log) + toast content.
   Same rules as ui.js: pure render functions, no mutation.
   ============================================================ */
(function (global) {
  'use strict';

  var Util = global.LQ.Util;
  var Data = global.LQ.Data;
  var State = global.LQ.State;
  var bar = global.LQ.UI.helpers.bar;
  var categoryChip = global.LQ.UI.helpers.categoryChip;
  var emptyState = global.LQ.UI.helpers.emptyState;

  function wrapModal(title, bodyHtml, extraClass) {
    return (
      '<div id="modal-overlay" class="lq-modal-overlay">' +
      '<div class="lq-modal ' + (extraClass || '') + '" role="dialog" aria-modal="true" aria-label="' + Util.escapeHtml(title) + '">' +
      '<div class="lq-modal__header"><h2>' + title + '</h2><button class="lq-icon-btn" data-action="close-modal" aria-label="Close">✖</button></div>' +
      '<div class="lq-modal__body">' + bodyHtml + '</div>' +
      '</div>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------
  // Achievements
  // ---------------------------------------------------------

  function renderAchievementsModal(state) {
    var cards = Data.ACHIEVEMENTS.map(function (ach) {
      var unlocked = State.isAchievementUnlocked(state, ach.id);
      var rec = unlocked ? state.achievementsUnlocked.filter(function (a) { return a.id === ach.id; })[0] : null;
      return (
        '<div class="lq-ach-card' + (unlocked ? ' is-unlocked' : '') + '">' +
        '<div class="lq-ach-card__emoji">' + (unlocked ? ach.emoji : '🔒') + '</div>' +
        '<div class="lq-ach-card__name">' + ach.name + '</div>' +
        '<div class="lq-ach-card__desc">' + ach.desc + '</div>' +
        (unlocked ? '<div class="lq-ach-card__date">' + Util.timeAgo(rec.unlockedAt) + '</div>' : '<div class="lq-ach-card__date">Locked</div>') +
        '</div>'
      );
    }).join('');
    return wrapModal('🏆 Achievements', '<div class="lq-ach-grid">' + cards + '</div>');
  }

  // ---------------------------------------------------------
  // Calendar
  // ---------------------------------------------------------

  function renderCalendarModal(state, ctx) {
    var year = ctx.calendarYear, month = ctx.calendarMonth;
    var first = new Date(year, month, 1);
    var startWeekday = (first.getDay() + 6) % 7; // Monday = 0
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayKey = Util.todayKey();
    var dailyTotal = Math.max(1, state.quests.daily.length);

    var cells = '';
    for (var i = 0; i < startWeekday; i++) cells += '<div class="lq-cal-cell lq-cal-cell--empty"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var key = Util.dateKey(new Date(year, month, d));
      var count = state.questLog.filter(function (e) { return e.completedAt.slice(0, 10) === key; }).length;
      var tierClass = count === 0 ? '' : (count < dailyTotal ? 'lq-cal-cell--low' : (count < dailyTotal + 2 ? 'lq-cal-cell--mid' : 'lq-cal-cell--high'));
      var isToday = key === todayKey;
      var isSelected = key === ctx.calendarSelectedDate;
      cells += (
        '<button class="lq-cal-cell ' + tierClass + (isToday ? ' lq-cal-cell--today' : '') + (isSelected ? ' is-selected' : '') + '" data-action="calendar-day" data-date="' + key + '">' +
        d + (count ? '<span class="lq-cal-dot"></span>' : '') +
        '</button>'
      );
    }

    var detail = '';
    if (ctx.calendarSelectedDate) {
      var entries = state.questLog.filter(function (e) { return e.completedAt.slice(0, 10) === ctx.calendarSelectedDate; });
      detail = (
        '<div class="lq-cal-detail">' +
        '<h3>' + ctx.calendarSelectedDate + '</h3>' +
        (entries.length ? '<ul class="lq-cal-detail__list">' + entries.map(function (e) {
          return '<li>' + (e.emoji || '📌') + ' ' + Util.escapeHtml(e.title) + ' <span>+' + e.xp + ' XP</span></li>';
        }).join('') + '</ul>' : '<p class="lq-cal-detail__empty">No quests completed that day.</p>') +
        '</div>'
      );
    }

    return wrapModal('📅 Calendar',
      '<div class="lq-cal-nav">' +
      '<button class="lq-icon-btn" data-action="calendar-prev">◀</button>' +
      '<span>' + Util.monthLabel(year, month) + '</span>' +
      '<button class="lq-icon-btn" data-action="calendar-next">▶</button>' +
      '</div>' +
      '<div class="lq-cal-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>' +
      '<div class="lq-cal-grid">' + cells + '</div>' +
      '<div class="lq-cal-legend"><span class="lq-cal-cell--low"></span> few <span class="lq-cal-cell--mid"></span> good <span class="lq-cal-cell--high"></span> great</div>' +
      detail
    );
  }

  // ---------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------

  function renderStatsModal(state) {
    var c = state.character;
    var eff = State.getEffectiveStats(state);
    var statsHtml = Data.STATS.map(function (s) {
      return '<div class="lq-stat-row"><span class="lq-stat-row__label">' + s.emoji + ' ' + s.label + '</span>' +
        bar(Util.pct(eff[s.key], 50), 'lq-bar--stat') +
        '<span class="lq-stat-row__value">' + eff[s.key] + '</span></div>';
    }).join('');

    var weekEntries = state.questLog.filter(function (e) { return Util.getWeekKey(new Date(e.completedAt)) === state.weekKey; });
    var weekBosses = state.defeatedBosses.filter(function (b) { return Util.getWeekKey(new Date(b.defeatedAt)) === state.weekKey; });
    var weekAch = state.achievementsUnlocked.filter(function (a) { return Util.getWeekKey(new Date(a.unlockedAt)) === state.weekKey; });

    return wrapModal('📈 Statistics',
      '<div class="lq-stats-head">Level ' + c.level + ' &middot; ' + c.xp + '/' + Data.xpForNextLevel(c.level) + ' XP</div>' +
      statsHtml +
      '<h3>This week</h3>' +
      '<div class="lq-stats-grid">' +
      '<div class="lq-stats-box">⚔️<b>' + weekEntries.length + '</b>quests</div>' +
      '<div class="lq-stats-box">💥<b>' + weekBosses.length + '</b>bosses</div>' +
      '<div class="lq-stats-box">🏆<b>' + weekAch.length + '</b>achievements</div>' +
      '<div class="lq-stats-box">🔥<b>' + state.streak.current + '</b>day streak</div>' +
      '</div>' +
      '<h3>Lifetime</h3>' +
      '<div class="lq-stats-grid">' +
      '<div class="lq-stats-box">⚔️<b>' + state.counters.totalQuestsCompleted + '</b>quests done</div>' +
      '<div class="lq-stats-box">💀<b>' + state.counters.totalBossesDefeated + '</b>bosses slain</div>' +
      '<div class="lq-stats-box">💰<b>' + state.counters.totalGoldEarned + '</b>gold earned</div>' +
      '<div class="lq-stats-box">✨<b>' + state.counters.totalXpEarned + '</b>XP earned</div>' +
      '<div class="lq-stats-box">📚<b>' + Math.round(state.counters.studyMinutes / 6) / 10 + '</b>study hours</div>' +
      '<div class="lq-stats-box">🏅<b>' + state.streak.longest + '</b>best streak</div>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------
  // Settings
  // ---------------------------------------------------------

  function renderSettingsModal(state) {
    var c = state.character;
    var avatarsHtml = Data.AVATARS.map(function (a) {
      return '<button type="button" class="lq-avatar-pick' + (c.avatar === a ? ' is-active' : '') + '" data-action="pick-settings-avatar" data-avatar="' + a + '">' + a + '</button>';
    }).join('');

    return wrapModal('⚙️ Settings',
      '<label class="lq-field-label">Hero name</label>' +
      '<input id="settings-name" class="lq-input" maxlength="24" value="' + Util.escapeHtml(c.name) + '" />' +
      '<label class="lq-field-label">Avatar</label>' +
      '<div class="lq-avatar-grid" id="settings-avatar-grid" data-current="' + c.avatar + '">' + avatarsHtml + '</div>' +
      '<button class="lq-btn lq-btn--primary lq-btn--block" data-action="save-settings">Save</button>' +

      '<label class="lq-checkbox-row"><input type="checkbox" id="reduce-motion-toggle"' + (state.settings.reduceMotion ? ' checked' : '') + ' /> Reduce motion / animations</label>' +

      '<div class="lq-settings-divider"></div>' +
      '<label class="lq-field-label">Save file</label>' +
      '<div class="lq-settings-row">' +
      '<button class="lq-btn" data-action="export-save">⬇️ Export save</button>' +
      '<button class="lq-btn" data-action="trigger-import">⬆️ Import save</button>' +
      '</div>' +
      '<input type="file" id="import-file-input" accept="application/json" style="display:none" />' +

      '<div class="lq-settings-divider"></div>' +
      '<label class="lq-field-label">Danger zone</label>' +
      '<button class="lq-btn lq-btn--danger lq-btn--block" data-action="reset-progress">🗑️ Reset all progress</button>' +

      '<p class="lq-settings-about">LifeQuest RPG &middot; saved locally in your browser (' + (global.LQ.Storage.isPersistent() ? 'localStorage active' : 'private mode — progress will not persist') + ').</p>'
    );
  }

  // ---------------------------------------------------------
  // Boss / dungeon log
  // ---------------------------------------------------------

  function renderBossModal(state) {
    var boss = state.boss;
    var log = state.defeatedBosses.slice(0, 20).reverse().map(function (b) {
      return '<li>' + b.emoji + ' ' + b.name + ' <small>(cycle ' + b.cycle + ')</small><span>' + Util.timeAgo(b.defeatedAt) + '</span></li>';
    }).join('');
    return wrapModal('👹 Dungeon',
      '<div class="lq-boss-modal__current">' +
      '<div class="lq-boss-modal__emoji">' + boss.emoji + '</div>' +
      '<div class="lq-boss-modal__name">' + boss.name + '</div>' +
      bar(Util.pct(boss.hp, boss.maxHp), 'lq-bar--hp') +
      '<div>' + boss.hp + ' / ' + boss.maxHp + ' HP</div>' +
      '</div>' +
      '<h3>🏆 Defeated Bosses</h3>' +
      (log ? '<ul class="lq-boss-log">' + log + '</ul>' : emptyState('💀', 'No bosses defeated yet. Complete quests to deal damage!'))
    );
  }

  // ---------------------------------------------------------
  // Add Quest form
  // ---------------------------------------------------------

  function renderAddQuestModal(state, ctx) {
    var draft = ctx.addQuestDraft;
    var types = [
      { id: 'daily', label: '📅 Daily' },
      { id: 'side', label: '🧹 Side' },
      { id: 'main', label: '⚔️ Main' }
    ];
    var typeButtons = types.map(function (t) {
      return '<button type="button" class="lq-tab' + (draft.type === t.id ? ' is-active' : '') + '" data-action="addquest-type" data-type="' + t.id + '">' + t.label + '</button>';
    }).join('');

    var categoryOptions = Data.STATS.map(function (s) {
      return '<option value="' + s.key + '"' + (draft.category === s.key ? ' selected' : '') + '>' + s.emoji + ' ' + s.label + '</option>';
    }).join('');

    var difficultyOptions = [1, 2, 3].map(function (n) {
      return '<option value="' + n + '"' + (Number(draft.difficulty) === n ? ' selected' : '') + '>' + Data.DIFFICULTY[n].stars + ' (' + Data.DIFFICULTY[n].xp + ' XP)</option>';
    }).join('');

    var stepsHtml = '';
    if (draft.type === 'main') {
      stepsHtml = '<label class="lq-field-label">Steps</label><div id="step-list">' +
        draft.steps.map(function (s, i) {
          return (
            '<div class="lq-step-row">' +
            '<input class="lq-input" data-step-index="' + i + '" value="' + Util.escapeHtml(s) + '" placeholder="Step ' + (i + 1) + '" />' +
            (draft.steps.length > 1 ? '<button type="button" class="lq-icon-btn lq-icon-btn--ghost" data-action="addquest-step-remove" data-index="' + i + '">✖</button>' : '') +
            '</div>'
          );
        }).join('') +
        '</div>' +
        '<button type="button" class="lq-link-btn" data-action="addquest-step-add">+ add step</button>';
    }

    var durationField = (draft.category === 'intelligence' && draft.type !== 'main') ?
      ('<label class="lq-field-label">Duration in minutes (optional)</label>' +
        '<input class="lq-input" name="durationMinutes" type="number" min="0" value="' + Util.escapeHtml(draft.durationMinutes || '') + '" />') : '';

    return wrapModal('➕ New Quest',
      '<div class="lq-tabs">' + typeButtons + '</div>' +
      '<label class="lq-field-label">Title</label>' +
      '<input class="lq-input" name="title" maxlength="60" placeholder="e.g. Clean the kitchen" value="' + Util.escapeHtml(draft.title) + '" autofocus />' +
      '<label class="lq-field-label">Icon (emoji)</label>' +
      '<input class="lq-input" name="emoji" maxlength="4" value="' + Util.escapeHtml(draft.emoji) + '" />' +
      '<label class="lq-field-label">Category — which stat grows</label>' +
      '<select class="lq-input" name="category">' + categoryOptions + '</select>' +
      (draft.type !== 'main' ? '<label class="lq-field-label">Difficulty</label><select class="lq-input" name="difficulty">' + difficultyOptions + '</select>' : '') +
      durationField +
      stepsHtml +
      '<div class="lq-form-error" id="addquest-error"></div>' +
      '<button type="button" class="lq-btn lq-btn--primary lq-btn--block" data-action="addquest-submit">Create Quest</button>'
    );
  }

  // ---------------------------------------------------------
  // Toast content
  // ---------------------------------------------------------

  function toastContent(evt) {
    switch (evt.type) {
      case 'quest':
        return { emoji: evt.emoji || '⚔️', text: 'Quest complete! +' + evt.xp + ' XP, +' + evt.gold + ' Gold' + (evt.loot ? ' &middot; 🎁 found ' + (Data.findPotion(evt.loot) || {}).name : '') };
      case 'levelup':
        return { emoji: '🎉', text: 'LEVEL UP! You reached level ' + evt.level };
      case 'bossdefeated':
        return { emoji: '🏆', text: 'BOSS DEFEATED: ' + evt.name + '! +' + evt.xp + ' XP, +' + evt.gold + ' Gold' };
      case 'achievement':
        return { emoji: '🏅', text: 'Achievement unlocked: ' + evt.name };
      case 'pet':
        return { emoji: evt.emoji || '🐾', text: 'New companion joined you: ' + evt.name + '!' };
      case 'mainquest':
        return { emoji: '🗺️', text: 'Epic quest complete! Bonus +' + evt.xp + ' XP, +' + evt.gold + ' Gold' };
      case 'weekly':
        return { emoji: evt.emoji || '🏆', text: 'Weekly reward claimed: ' + evt.title };
      case 'potion':
        return { emoji: evt.emoji || '🧪', text: 'Used ' + evt.name };
      case 'purchase':
        return { emoji: evt.emoji || '🛍️', text: 'Bought ' + evt.name };
      case 'skill':
        return { emoji: evt.emoji || '🌳', text: 'Learned skill: ' + evt.name };
      case 'streaksaved':
        return { emoji: '🛡️', text: 'Your streak was protected!' };
      case 'questadded':
        return { emoji: '📝', text: 'New quest added: ' + evt.title };
      case 'info':
        return { emoji: evt.emoji || 'ℹ️', text: evt.text };
      case 'error':
        return { emoji: '⚠️', text: evt.message };
      default:
        return { emoji: '✨', text: 'Something happened.' };
    }
  }

  var Modals = {
    wrapModal: wrapModal,
    renderAchievementsModal: renderAchievementsModal,
    renderCalendarModal: renderCalendarModal,
    renderStatsModal: renderStatsModal,
    renderSettingsModal: renderSettingsModal,
    renderBossModal: renderBossModal,
    renderAddQuestModal: renderAddQuestModal,
    toastContent: toastContent
  };

  global.LQ = global.LQ || {};
  global.LQ.Modals = Modals;
})(typeof window !== 'undefined' ? window : global);