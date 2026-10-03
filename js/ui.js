/* ============================================================
   LifeQuest RPG — ui.js
   Pure render functions: (state, ctx) -> HTML string.
   No mutation happens here — these functions only read state
   and produce markup. app.js wires up events separately via
   event delegation (data-action attributes).
   ============================================================ */
(function (global) {
  'use strict';

  var Util = global.LQ.Util;
  var Data = global.LQ.Data;
  var State = global.LQ.State;

  // ---------------------------------------------------------
  // Small shared building blocks
  // ---------------------------------------------------------

  function bar(valuePct, modifierClass) {
    valuePct = Util.clamp(valuePct, 0, 100);
    return '<div class="lq-bar ' + (modifierClass || '') + '">' +
      '<div class="lq-bar__fill" style="width:' + valuePct + '%"></div>' +
      '</div>';
  }

  function categoryChip(catKey) {
    var meta = Data.statMeta(catKey);
    if (!meta) return '';
    return '<span class="lq-chip" title="' + Util.escapeHtml(meta.grows) + '">' + meta.emoji + ' ' + meta.label + '</span>';
  }

  function emptyState(icon, text) {
    return '<div class="lq-empty"><div class="lq-empty__icon">' + icon + '</div><p>' + text + '</p></div>';
  }

  // ---------------------------------------------------------
  // Onboarding — character creation
  // ---------------------------------------------------------

  function renderOnboarding(form) {
    var classesHtml = Object.keys(Data.CLASSES).map(function (id) {
      var c = Data.CLASSES[id];
      var active = form.classId === id;
      var bonuses = Object.keys(c.statBonuses).map(function (k) {
        var meta = Data.statMeta(k);
        return meta.emoji + '+' + c.statBonuses[k] + ' ' + meta.label;
      }).join(' &middot; ');
      return (
        '<button type="button" class="lq-class-card' + (active ? ' is-active' : '') + '" data-action="select-class" data-class="' + id + '" style="--class-color:' + c.color + '">' +
        '<div class="lq-class-card__emoji">' + c.emoji + '</div>' +
        '<div class="lq-class-card__name">' + c.name + '</div>' +
        '<div class="lq-class-card__tagline">' + c.tagline + '</div>' +
        '<div class="lq-class-card__bonus">' + bonuses + '</div>' +
        '</button>'
      );
    }).join('');

    var avatarsHtml = Data.AVATARS.map(function (a) {
      var active = form.avatar === a;
      return '<button type="button" class="lq-avatar-pick' + (active ? ' is-active' : '') + '" data-action="select-avatar" data-avatar="' + a + '">' + a + '</button>';
    }).join('');

    return (
      '<div class="lq-onboarding">' +
      '<div class="lq-onboarding__title">⚔️ LIFEQUEST<span>RPG</span></div>' +
      '<p class="lq-onboarding__subtitle">Turn real life into an adventure. Create your hero to begin.</p>' +

      '<label class="lq-field-label" for="hero-name">Hero name</label>' +
      '<input id="hero-name" class="lq-input" maxlength="24" placeholder="Enter a name..." value="' + Util.escapeHtml(form.name || '') + '" />' +

      '<label class="lq-field-label">Choose your class</label>' +
      '<div class="lq-class-grid">' + classesHtml + '</div>' +

      '<label class="lq-field-label">Choose your look</label>' +
      '<div class="lq-avatar-grid">' + avatarsHtml + '</div>' +

      '<p class="lq-onboarding__hint">Your class is just a starting point — stats you actually earn from real quests will shape who your hero becomes.</p>' +

      '<button type="button" class="lq-btn lq-btn--primary lq-btn--block" data-action="begin-adventure">Begin Adventure ⚔️</button>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------
  // Shared header + bottom nav (shown on every main-app view)
  // ---------------------------------------------------------

  function renderHeader(state) {
    var c = state.character;
    var needed = Data.xpForNextLevel(c.level);
    var cls = Data.CLASSES[c.classId];
    return (
      '<header class="lq-header">' +
      '<div class="lq-header__top">' +
      '<div class="lq-hero-tag">' +
      '<span class="lq-hero-avatar" style="--class-color:' + cls.color + '">' + c.avatar + '</span>' +
      '<span class="lq-hero-info">' +
      '<span class="lq-hero-name">' + Util.escapeHtml(c.name) + '</span>' +
      '<span class="lq-hero-level">LEVEL ' + c.level + ' &middot; ' + cls.name + '</span>' +
      '</span>' +
      '</span>' +
      '</div>' +
      '<button class="lq-icon-btn" data-action="open-modal" data-modal="settings" title="Settings" aria-label="Settings">⚙️</button>' +
      '</div>' +
      '<div class="lq-xp-row">' +
      bar(Util.pct(c.xp, needed), 'lq-bar--xp') +
      '<span class="lq-xp-row__label">' + c.xp + ' / ' + needed + ' XP</span>' +
      '</div>' +
      '<div class="lq-stat-pills">' +
      '<button class="lq-pill" data-action="open-modal" data-modal="stats" title="Energy">⚡ ' + c.energy + '/' + c.maxEnergy + '</button>' +
      '<button class="lq-pill" data-action="open-modal" data-modal="stats" title="Gold">💰 ' + c.gold + '</button>' +
      '<button class="lq-pill" data-action="open-modal" data-modal="stats" title="Streak">🔥 ' + state.streak.current + '</button>' +
      '<button class="lq-pill" data-action="open-modal" data-modal="achievements" title="Achievements">🏆 ' + state.achievementsUnlocked.length + '/' + Data.ACHIEVEMENTS.length + '</button>' +
      '</div>' +
      '</header>'
    );
  }

  var NAV_ITEMS = [
    { id: 'home', emoji: '🏠', label: 'Home' },
    { id: 'world', emoji: '🗺️', label: 'World' },
    { id: 'quests', emoji: '⚔️', label: 'Quests' },
    { id: 'character', emoji: '🧙', label: 'Character' },
    { id: 'inventory', emoji: '🎒', label: 'Inventory' }
  ];

  function renderNav(active) {
    return (
      '<nav class="lq-nav">' +
      NAV_ITEMS.map(function (item) {
        return (
          '<button class="lq-nav__item' + (active === item.id ? ' is-active' : '') + '" data-action="nav-view" data-view="' + item.id + '">' +
          '<span class="lq-nav__icon">' + item.emoji + '</span>' +
          '<span class="lq-nav__label">' + item.label + '</span>' +
          '</button>'
        );
      }).join('') +
      '</nav>'
    );
  }

  // ---------------------------------------------------------
  // HOME view
  // ---------------------------------------------------------

  function renderHome(state) {
    var today = Util.todayKey();
    var isResting = state.restModeDate === today;
    var doneCount = state.quests.daily.filter(function (q) { return State.isDailyDoneToday(state, q.id); }).length;

    var dailyHtml = state.quests.daily.map(function (q) {
      var done = State.isDailyDoneToday(state, q.id);
      return (
        '<li class="lq-quest-row' + (done ? ' is-done' : '') + '">' +
        '<button class="lq-quest-check" data-action="toggle-daily" data-id="' + q.id + '" aria-label="Toggle quest">' + (done ? '✅' : '☐') + '</button>' +
        '<span class="lq-quest-row__emoji">' + q.emoji + '</span>' +
        '<span class="lq-quest-row__title">' + Util.escapeHtml(q.title) + '</span>' +
        '<span class="lq-quest-row__reward">+' + q.xp + ' XP</span>' +
        '</li>'
      );
    }).join('');

    var boss = state.boss;

    return (
      '<div class="lq-view lq-view--home">' +

      (isResting ?
        '<div class="lq-rest-banner">😌 Today is a rest day. Take care of yourself — no pressure.' +
        '<button class="lq-link-btn" data-action="toggle-restmode">End rest mode</button></div>' :
        '<div class="lq-rest-prompt">Low on energy? <button class="lq-link-btn" data-action="toggle-restmode">Start a rest day 💤</button></div>'
      ) +

      '<section class="lq-card">' +
      '<div class="lq-card__header"><h2>⚔️ Today\'s Quests</h2><span class="lq-card__badge">' + doneCount + '/' + state.quests.daily.length + '</span></div>' +
      (state.quests.daily.length ? '<ul class="lq-quest-list">' + dailyHtml + '</ul>' : emptyState('🗒️', 'No daily quests yet. Add some from the Quests tab!')) +
      '</section>' +

      '<section class="lq-card lq-boss-card" data-action="open-modal" data-modal="boss">' +
      '<div class="lq-card__header"><h2>' + boss.emoji + ' BOSS: ' + boss.name.toUpperCase() + '</h2><span class="lq-card__badge">Cycle ' + boss.cycle + '</span></div>' +
      bar(Util.pct(boss.hp, boss.maxHp), 'lq-bar--hp') +
      '<div class="lq-boss-card__hp">' + boss.hp + ' / ' + boss.maxHp + ' HP</div>' +
      '<p class="lq-boss-card__hint">Every completed quest deals damage equal to its XP. Tap for the battle log.</p>' +
      '</section>' +

      '<section class="lq-card lq-streak-card">' +
      '<div class="lq-streak-flame">🔥</div>' +
      '<div>' +
      '<div class="lq-streak-value">' + state.streak.current + ' day streak</div>' +
      '<div class="lq-streak-sub">Best: ' + state.streak.longest + ' days' + (state.streak.shieldCharges > 0 ? ' &middot; 🛡️ ' + state.streak.shieldCharges + ' shield' : '') + '</div>' +
      '</div>' +
      '</section>' +

      (state.quests.main.filter(function (m) { return !m.completed; }).length ?
        '<section class="lq-card">' +
        '<div class="lq-card__header"><h2>🗺️ Active Main Quest</h2></div>' +
        renderMainPreview(state.quests.main.filter(function (m) { return !m.completed; })[0]) +
        '</section>' : '') +

      '</div>'
    );
  }

  function renderMainPreview(m) {
    var total = m.steps.length;
    var done = m.steps.filter(function (s) { return s.done; }).length;
    return (
      '<div class="lq-main-preview">' +
      '<div class="lq-main-preview__title">' + m.emoji + ' ' + Util.escapeHtml(m.title) + '</div>' +
      bar(Util.pct(done, total), 'lq-bar--xp') +
      '<div class="lq-main-preview__sub">' + done + ' / ' + total + ' steps complete</div>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------
  // WORLD view
  // ---------------------------------------------------------

  function renderWorld(state) {
    var level = state.character.level;
    var regionsHtml = Data.WORLD_REGIONS.map(function (r) {
      var unlocked = level >= r.requiredLevel;
      var extra = r.isBoss ? ' lq-region--boss' : '';
      return (
        '<button class="lq-region lq-region--' + r.id + extra + (unlocked ? '' : ' is-locked') + '" data-action="region-click" data-region="' + r.id + '"' + (unlocked ? '' : ' disabled') + '>' +
        '<span class="lq-region__emoji">' + (unlocked ? r.emoji : '🔒') + '</span>' +
        '<span class="lq-region__name">' + r.name + '</span>' +
        (unlocked ? (r.category ? categoryChip(r.category) : (r.isBoss ? '<span class="lq-chip">' + state.boss.emoji + ' ' + state.boss.name + '</span>' : '')) : '<span class="lq-region__req">Lv. ' + r.requiredLevel + '</span>') +
        '</button>'
      );
    }).join('');

    return (
      '<div class="lq-view lq-view--world">' +
      '<section class="lq-card">' +
      '<div class="lq-card__header"><h2>🗺️ World Map</h2></div>' +
      '<p class="lq-map-hint">Real-life categories become regions. Level up to unlock new areas.</p>' +
      '<div class="lq-map">' + regionsHtml + '</div>' +
      '</section>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------
  // QUESTS view
  // ---------------------------------------------------------

  var QUEST_TABS = [
    { id: 'daily', label: 'Daily', emoji: '📅' },
    { id: 'side', label: 'Side', emoji: '🧹' },
    { id: 'main', label: 'Main', emoji: '⚔️' },
    { id: 'weekly', label: 'Weekly', emoji: '🏆' }
  ];

  function renderQuests(state, ctx) {
    var tab = ctx.questTab || 'daily';
    var tabsHtml = QUEST_TABS.map(function (t) {
      return '<button class="lq-tab' + (tab === t.id ? ' is-active' : '') + '" data-action="quest-tab" data-tab="' + t.id + '">' + t.emoji + ' ' + t.label + '</button>';
    }).join('');

    var content = '';
    if (tab === 'daily') content = renderDailyTab(state, ctx);
    else if (tab === 'side') content = renderSideTab(state, ctx);
    else if (tab === 'main') content = renderMainTab(state);
    else if (tab === 'weekly') content = renderWeeklyTab(state);

    var canAdd = tab !== 'weekly';
    var filterBanner = '';
    if (ctx.questFilterCategory && (tab === 'daily' || tab === 'side')) {
      filterBanner = '<div class="lq-filter-banner">🗺️ Showing ' + categoryChip(ctx.questFilterCategory) + ' quests first <button class="lq-link-btn" data-action="clear-quest-filter">✕ clear</button></div>';
    }

    return (
      '<div class="lq-view lq-view--quests">' +
      '<div class="lq-tabs">' + tabsHtml + '</div>' +
      filterBanner +
      content +
      (canAdd ? '<button class="lq-fab" data-action="open-modal" data-modal="addquest" data-type="' + tab + '" aria-label="Add quest">➕</button>' : '') +
      '</div>'
    );
  }

  function sortByFilter(list, ctx) {
    if (!ctx || !ctx.questFilterCategory) return list;
    var cat = ctx.questFilterCategory;
    return list.slice().sort(function (a, b) {
      var am = a.category === cat ? 0 : 1;
      var bm = b.category === cat ? 0 : 1;
      return am - bm;
    });
  }

  function renderDailyTab(state, ctx) {
    if (!state.quests.daily.length) return emptyState('📅', 'No daily quests yet. Tap ➕ to add your first habit.');
    var list = sortByFilter(state.quests.daily, ctx);
    return '<ul class="lq-quest-list">' + list.map(function (q) {
      var done = State.isDailyDoneToday(state, q.id);
      var highlighted = ctx && ctx.questFilterCategory && q.category === ctx.questFilterCategory;
      return (
        '<li class="lq-quest-card' + (done ? ' is-done' : '') + (highlighted ? ' is-highlighted' : '') + '">' +
        '<button class="lq-quest-check" data-action="toggle-daily" data-id="' + q.id + '">' + (done ? '✅' : '☐') + '</button>' +
        '<div class="lq-quest-card__body">' +
        '<div class="lq-quest-card__title">' + q.emoji + ' ' + Util.escapeHtml(q.title) + '</div>' +
        '<div class="lq-quest-card__meta">' + categoryChip(q.category) + '<span class="lq-stars">' + Data.DIFFICULTY[q.difficulty].stars + '</span></div>' +
        '</div>' +
        '<div class="lq-quest-card__reward">+' + q.xp + ' XP<br>+' + q.gold + ' 💰</div>' +
        '<button class="lq-icon-btn lq-icon-btn--ghost" data-action="delete-quest" data-type="daily" data-id="' + q.id + '" aria-label="Delete">🗑️</button>' +
        '</li>'
      );
    }).join('') + '</ul>';
  }

  function renderSideTab(state, ctx) {
    if (!state.quests.side.length) return emptyState('🧹', 'No side quests right now. Tap ➕ to add one.');
    var list = sortByFilter(state.quests.side, ctx);
    return '<ul class="lq-quest-list">' + list.map(function (q) {
      var highlighted = ctx && ctx.questFilterCategory && q.category === ctx.questFilterCategory;
      return (
        '<li class="lq-quest-card' + (highlighted ? ' is-highlighted' : '') + '">' +
        '<button class="lq-quest-check" data-action="complete-side" data-id="' + q.id + '">☐</button>' +
        '<div class="lq-quest-card__body">' +
        '<div class="lq-quest-card__title">' + q.emoji + ' ' + Util.escapeHtml(q.title) + '</div>' +
        '<div class="lq-quest-card__meta">' + categoryChip(q.category) + '<span class="lq-stars">' + Data.DIFFICULTY[q.difficulty].stars + '</span></div>' +
        '</div>' +
        '<div class="lq-quest-card__reward">+' + q.xp + ' XP<br>+' + q.gold + ' 💰</div>' +
        '<button class="lq-icon-btn lq-icon-btn--ghost" data-action="delete-quest" data-type="side" data-id="' + q.id + '" aria-label="Delete">🗑️</button>' +
        '</li>'
      );
    }).join('') + '</ul>';
  }

  function renderMainTab(state) {
    if (!state.quests.main.length) return emptyState('⚔️', 'No epic quests yet. Tap ➕ to start a saga.');
    return state.quests.main.map(function (m) {
      var total = m.steps.length;
      var done = m.steps.filter(function (s) { return s.done; }).length;
      var stepsHtml = m.steps.map(function (s) {
        return (
          '<li class="lq-chain__step' + (s.done ? ' is-done' : '') + '">' +
          '<button class="lq-quest-check lq-quest-check--sm" data-action="complete-mainstep" data-main="' + m.id + '" data-step="' + s.id + '"' + (s.done ? ' disabled' : '') + '>' + (s.done ? '✅' : '○') + '</button>' +
          '<span>' + Util.escapeHtml(s.title) + '</span>' +
          '</li>'
        );
      }).join('');
      return (
        '<section class="lq-card lq-epic-card' + (m.completed ? ' is-complete' : '') + '">' +
        '<div class="lq-card__header">' +
        '<h2>' + m.emoji + ' ' + Util.escapeHtml(m.title) + '</h2>' +
        (m.completed ? '<span class="lq-card__badge lq-card__badge--gold">✅ Done</span>' : '<button class="lq-icon-btn lq-icon-btn--ghost" data-action="delete-quest" data-type="main" data-id="' + m.id + '">🗑️</button>') +
        '</div>' +
        bar(Util.pct(done, total), 'lq-bar--xp') +
        '<ul class="lq-chain">' + stepsHtml + '</ul>' +
        (!m.completed ? '<div class="lq-epic-card__bonus">🎁 Completion bonus: +' + m.bonusXp + ' XP, +' + m.bonusGold + ' Gold</div>' : '') +
        '</section>'
      );
    }).join('');
  }

  function renderWeeklyTab(state) {
    return '<div class="lq-weekly-note">Resets every Monday. Keep going!</div>' + Data.WEEKLY_QUEST_DEFS.map(function (def) {
      var progress = state.weeklyProgress[def.id] || 0;
      var claimed = !!state.weeklyClaimed[def.id];
      var ready = progress >= def.target;
      return (
        '<section class="lq-card">' +
        '<div class="lq-card__header"><h2>' + def.emoji + ' ' + def.title + '</h2></div>' +
        bar(Util.pct(progress, def.target), ready ? 'lq-bar--gold' : 'lq-bar--xp') +
        '<div class="lq-weekly-progress">' + Math.min(progress, def.target) + ' / ' + def.target + '</div>' +
        '<button class="lq-btn lq-btn--primary lq-btn--block" data-action="claim-weekly" data-id="' + def.id + '"' + (ready && !claimed ? '' : ' disabled') + '>' +
        (claimed ? '✅ Claimed' : ('Claim +' + def.xp + ' XP, +' + def.gold + ' 💰')) +
        '</button>' +
        '</section>'
      );
    }).join('');
  }

  // ---------------------------------------------------------
  // CHARACTER view
  // ---------------------------------------------------------

  function renderCharacter(state) {
    var c = state.character;
    var cls = Data.CLASSES[c.classId];
    var effStats = State.getEffectiveStats(state);
    var maxStatForBar = Math.max(30, Math.max.apply(null, Data.STATS.map(function (s) { return effStats[s.key]; })));

    var statsHtml = Data.STATS.map(function (s) {
      var base = c.stats[s.key];
      var eff = effStats[s.key];
      var bonus = eff - base;
      return (
        '<div class="lq-stat-row">' +
        '<span class="lq-stat-row__label">' + s.emoji + ' ' + s.label + '</span>' +
        bar(Util.pct(eff, maxStatForBar), 'lq-bar--stat') +
        '<span class="lq-stat-row__value">' + eff + (bonus > 0 ? ' <small>(+' + bonus + ')</small>' : '') + '</span>' +
        '</div>'
      );
    }).join('');

    var equipRow = Data.EQUIPMENT_SLOTS.map(function (slot) {
      var itemId = c.equipment[slot];
      var item = itemId ? Data.findShopItem(itemId) : null;
      return '<div class="lq-equip-slot" title="' + slot + (item ? ': ' + item.name : ': empty') + '">' + (item ? item.emoji : '▫️') + '</div>';
    }).join('');

    var branches = {};
    Data.SKILLS.forEach(function (sk) { (branches[sk.branch] = branches[sk.branch] || []).push(sk); });
    var skillsHtml = Object.keys(branches).map(function (branch) {
      return (
        '<div class="lq-skill-branch">' +
        '<div class="lq-skill-branch__title">' + branch + '</div>' +
        branches[branch].map(function (sk) {
          var learned = State.hasSkill(state, sk.id);
          var canAfford = c.skillPoints >= sk.cost;
          return (
            '<div class="lq-skill' + (learned ? ' is-learned' : '') + '">' +
            '<div class="lq-skill__icon">' + sk.emoji + '</div>' +
            '<div class="lq-skill__body"><div class="lq-skill__name">' + sk.name + '</div><div class="lq-skill__desc">' + sk.desc + '</div></div>' +
            (learned ? '<span class="lq-chip lq-chip--gold">Learned</span>' :
              '<button class="lq-btn lq-btn--sm" data-action="learn-skill" data-skill="' + sk.id + '"' + (canAfford ? '' : ' disabled') + '>' + sk.cost + ' SP</button>') +
            '</div>'
          );
        }).join('') +
        '</div>'
      );
    }).join('');

    var petsHtml = state.pets.length ? state.pets.map(function (p) {
      var def = Data.findPetDef(p.id);
      var active = c.activePetId === p.id;
      var needed = 50 + (p.level - 1) * 40;
      return (
        '<div class="lq-pet-row' + (active ? ' is-active' : '') + '">' +
        '<span class="lq-pet-row__emoji">' + def.emoji + '</span>' +
        '<div class="lq-pet-row__body"><div>' + def.name + ' &middot; Lv.' + p.level + '</div>' + bar(Util.pct(p.xp, needed), 'lq-bar--xp') + '</div>' +
        '<button class="lq-btn lq-btn--sm" data-action="set-active-pet" data-pet="' + p.id + '"' + (active ? ' disabled' : '') + '>' + (active ? 'Active' : 'Summon') + '</button>' +
        '</div>'
      );
    }).join('') : emptyState('🐾', 'No companions yet. Keep your streak alive to attract one.');

    return (
      '<div class="lq-view lq-view--character">' +

      '<section class="lq-card lq-character-banner" style="--class-color:' + cls.color + '">' +
      '<div class="lq-character-banner__avatar">' + c.avatar + '</div>' +
      '<div>' +
      '<div class="lq-character-banner__name">' + Util.escapeHtml(c.name) + '</div>' +
      '<div class="lq-character-banner__class">' + cls.emoji + ' ' + cls.name + ' &middot; Level ' + c.level + '</div>' +
      '<div class="lq-character-banner__sp">✨ ' + c.skillPoints + ' skill points available</div>' +
      '</div>' +
      '</section>' +

      '<section class="lq-card">' +
      '<div class="lq-card__header"><h2>📊 Stats</h2></div>' +
      statsHtml +
      '</section>' +

      '<section class="lq-card">' +
      '<div class="lq-card__header"><h2>🗡️ Equipped</h2></div>' +
      '<div class="lq-equip-row">' + equipRow + '</div>' +
      '</section>' +

      '<section class="lq-card">' +
      '<div class="lq-card__header"><h2>🌳 Skills</h2></div>' +
      skillsHtml +
      '</section>' +

      '<section class="lq-card">' +
      '<div class="lq-card__header"><h2>🐾 Companions</h2></div>' +
      petsHtml +
      '</section>' +

      '<section class="lq-card lq-menu-card">' +
      '<button class="lq-menu-btn" data-action="open-modal" data-modal="achievements">🏆 Achievements</button>' +
      '<button class="lq-menu-btn" data-action="open-modal" data-modal="calendar">📅 Calendar</button>' +
      '<button class="lq-menu-btn" data-action="open-modal" data-modal="stats">📈 Statistics</button>' +
      '<button class="lq-menu-btn" data-action="open-modal" data-modal="settings">⚙️ Settings</button>' +
      '</section>' +

      '</div>'
    );
  }

  // ---------------------------------------------------------
  // INVENTORY view
  // ---------------------------------------------------------

  var INV_TABS = [
    { id: 'equipment', label: 'Equipment', emoji: '🗡️' },
    { id: 'backpack', label: 'Backpack', emoji: '🎒' },
    { id: 'shop', label: 'Shop', emoji: '🏪' },
    { id: 'pets', label: 'Pets', emoji: '🐾' }
  ];

  function renderInventory(state, ctx) {
    var tab = ctx.invTab || 'equipment';
    var tabsHtml = INV_TABS.map(function (t) {
      return '<button class="lq-tab' + (tab === t.id ? ' is-active' : '') + '" data-action="inv-tab" data-tab="' + t.id + '">' + t.emoji + ' ' + t.label + '</button>';
    }).join('');

    var content = '';
    if (tab === 'equipment') content = renderEquipmentTab(state);
    else if (tab === 'backpack') content = renderBackpackTab(state);
    else if (tab === 'shop') content = renderShopTab(state);
    else if (tab === 'pets') content = renderPetsTab(state);

    return (
      '<div class="lq-view lq-view--inventory">' +
      '<div class="lq-gold-banner">💰 ' + state.character.gold + ' Gold</div>' +
      '<div class="lq-tabs">' + tabsHtml + '</div>' +
      content +
      '</div>'
    );
  }

  function renderEquipmentTab(state) {
    var c = state.character;
    return '<div class="lq-equip-grid">' + Data.EQUIPMENT_SLOTS.map(function (slot) {
      var itemId = c.equipment[slot];
      var item = itemId ? Data.findShopItem(itemId) : null;
      return (
        '<div class="lq-equip-box">' +
        '<div class="lq-equip-box__slot">' + slot + '</div>' +
        '<div class="lq-equip-box__icon">' + (item ? item.emoji : '▫️') + '</div>' +
        '<div class="lq-equip-box__name">' + (item ? item.name : 'Empty') + '</div>' +
        (item ? '<div class="lq-equip-box__bonus">' + item.desc + '</div>' : '') +
        (item ? '<button class="lq-btn lq-btn--sm" data-action="unequip-slot" data-slot="' + slot + '">Unequip</button>' : '') +
        '</div>'
      );
    }).join('') + '</div>';
  }

  function renderBackpackTab(state) {
    var ownedIds = Object.keys(state.inventory).filter(function (id) { return state.inventory[id] > 0; });
    if (!ownedIds.length) return emptyState('🎒', 'Your backpack is empty. Visit the Shop or complete quests for a chance at loot.');
    return '<ul class="lq-item-list">' + ownedIds.map(function (id) {
      var qty = state.inventory[id];
      var equipItem = Data.findShopItem(id);
      var potion = Data.findPotion(id);
      if (equipItem) {
        var equippedSomewhere = state.character.equipment[equipItem.slot] === id;
        return (
          '<li class="lq-item-row">' +
          '<span class="lq-item-row__emoji">' + equipItem.emoji + '</span>' +
          '<div class="lq-item-row__body"><div class="lq-item-row__name">' + equipItem.name + '</div><div class="lq-item-row__desc">' + equipItem.desc + '</div></div>' +
          '<button class="lq-btn lq-btn--sm" data-action="equip-item" data-item="' + id + '"' + (equippedSomewhere ? ' disabled' : '') + '>' + (equippedSomewhere ? 'Equipped' : 'Equip') + '</button>' +
          '</li>'
        );
      }
      if (potion) {
        return (
          '<li class="lq-item-row">' +
          '<span class="lq-item-row__emoji">' + potion.emoji + '</span>' +
          '<div class="lq-item-row__body"><div class="lq-item-row__name">' + potion.name + ' &times;' + qty + '</div><div class="lq-item-row__desc">' + potion.desc + '</div></div>' +
          '<button class="lq-btn lq-btn--sm" data-action="use-potion" data-item="' + id + '">Use</button>' +
          '</li>'
        );
      }
      return '';
    }).join('') + '</ul>';
  }

  function renderShopTab(state) {
    var gold = state.character.gold;
    function row(item) {
      var afford = gold >= item.cost;
      return (
        '<li class="lq-item-row">' +
        '<span class="lq-item-row__emoji">' + item.emoji + '</span>' +
        '<div class="lq-item-row__body"><div class="lq-item-row__name">' + item.name + '</div><div class="lq-item-row__desc">' + item.desc + '</div></div>' +
        '<button class="lq-btn lq-btn--sm" data-action="buy-item" data-item="' + item.id + '"' + (afford ? '' : ' disabled') + '>' + item.cost + ' 💰</button>' +
        '</li>'
      );
    }
    return (
      '<div class="lq-shop-section-title">Equipment</div>' +
      '<ul class="lq-item-list">' + Data.SHOP_ITEMS.map(row).join('') + '</ul>' +
      '<div class="lq-shop-section-title">Potions</div>' +
      '<ul class="lq-item-list">' + Data.POTIONS.map(row).join('') + '</ul>'
    );
  }

  function renderPetsTab(state) {
    var owned = {};
    state.pets.forEach(function (p) { owned[p.id] = p; });
    return '<ul class="lq-item-list">' + Data.PETS.map(function (def) {
      var p = owned[def.id];
      if (p) {
        var active = state.character.activePetId === p.id;
        var needed = 50 + (p.level - 1) * 40;
        return (
          '<li class="lq-item-row">' +
          '<span class="lq-item-row__emoji">' + def.emoji + '</span>' +
          '<div class="lq-item-row__body"><div class="lq-item-row__name">' + def.name + ' &middot; Lv.' + p.level + '</div>' + bar(Util.pct(p.xp, needed), 'lq-bar--xp') + '</div>' +
          '<button class="lq-btn lq-btn--sm" data-action="set-active-pet" data-pet="' + p.id + '"' + (active ? ' disabled' : '') + '>' + (active ? 'Active' : 'Summon') + '</button>' +
          '</li>'
        );
      }
      return (
        '<li class="lq-item-row lq-item-row--locked">' +
        '<span class="lq-item-row__emoji">🔒</span>' +
        '<div class="lq-item-row__body"><div class="lq-item-row__name">' + def.name + '</div><div class="lq-item-row__desc">' + def.desc + '</div></div>' +
        '</li>'
      );
    }).join('') + '</ul>';
  }

  var UI = {
    renderOnboarding: renderOnboarding,
    renderHeader: renderHeader,
    renderNav: renderNav,
    renderHome: renderHome,
    renderWorld: renderWorld,
    renderQuests: renderQuests,
    renderCharacter: renderCharacter,
    renderInventory: renderInventory,
    helpers: { bar: bar, categoryChip: categoryChip, emptyState: emptyState }
  };

  global.LQ = global.LQ || {};
  global.LQ.UI = UI;
})(typeof window !== 'undefined' ? window : global);