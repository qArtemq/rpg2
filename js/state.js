/* ============================================================
   LifeQuest RPG — state.js
   The game engine: owns the mutable game state and every rule
   for how it changes. Zero DOM access — this file could be
   unit-tested (or ported to a server) without any changes.

   Pattern: every exported action takes `state` plus arguments,
   mutates it in place, may push human-readable events onto
   `state._events` (transient, never persisted) and returns a
   small result object. The UI layer drains `_events` after each
   action to show toasts, then re-renders and saves.
   ============================================================ */
(function (global) {
  'use strict';

  var Util = global.LQ.Util;
  var Data = global.LQ.Data;

  // ---------------------------------------------------------
  // Construction
  // ---------------------------------------------------------

  function freshStats() {
    var stats = {};
    Data.STATS.forEach(function (s) { stats[s.key] = 5; });
    return stats;
  }

  function cloneDailyTemplate(t) {
    return {
      id: Util.uid('dq'),
      title: t.title, emoji: t.emoji || '📌', category: t.category,
      difficulty: t.difficulty, xp: t.xp, gold: t.gold, energy: t.energy
    };
  }

  function cloneSideTemplate(t) {
    var d = Data.DIFFICULTY[t.difficulty];
    return {
      id: Util.uid('sq'),
      title: t.title, emoji: t.emoji || '📌', category: t.category,
      difficulty: t.difficulty,
      xp: Math.round(d.xp * Data.TYPE_MULTIPLIER.side),
      gold: Math.round(d.gold * Data.TYPE_MULTIPLIER.side),
      energy: d.energy
    };
  }

  function cloneMainTemplate(t) {
    return {
      id: Util.uid('mq'),
      title: t.title, emoji: t.emoji || '⚔️', category: t.category,
      steps: t.steps.map(function (label) { return { id: Util.uid('step'), title: label, done: false }; }),
      bonusXp: t.bonusXp, bonusGold: t.bonusGold,
      completed: false, completedAt: null
    };
  }

  function createCharacter(name, classId, avatar) {
    var cls = Data.CLASSES[classId] || Data.CLASSES.warrior;
    var stats = freshStats();
    Object.keys(cls.statBonuses).forEach(function (k) { stats[k] += cls.statBonuses[k]; });

    var state = {
      version: 1,
      createdAt: new Date().toISOString(),
      character: {
        name: (name || 'Hero').trim().slice(0, 24) || 'Hero',
        classId: cls.id,
        avatar: avatar || cls.emoji,
        level: 1,
        xp: 0,
        gold: 100,
        energy: 100,
        maxEnergy: 100,
        skillPoints: 0,
        stats: stats,
        equipment: { weapon: null, armor: null, gloves: null, boots: null, backpack: null, trinket: null },
        learnedSkills: [],
        activePetId: null
      },
      quests: {
        daily: Data.STARTER_DAILY.map(cloneDailyTemplate),
        side: Data.STARTER_SIDE.map(cloneSideTemplate),
        main: Data.STARTER_MAIN.map(cloneMainTemplate)
      },
      dailyCompletions: {},
      weekKey: Util.getWeekKey(new Date()),
      weeklyProgress: {},
      weeklyClaimed: {},
      boss: Data.spawnBoss(0, 1),
      defeatedBosses: [],
      inventory: {},
      pets: [],
      achievementsUnlocked: [],
      streak: { current: 0, longest: 0, lastActiveDate: null, shieldCharges: 0 },
      activeEffects: { xpBoostCharges: 0, luckyChargeCharges: 0 },
      counters: {
        totalQuestsCompleted: 0, totalDailyCompleted: 0, totalBossesDefeated: 0,
        totalGoldEarned: 0, totalXpEarned: 0, studyMinutes: 0
      },
      questLog: [],
      lastSeenDate: Util.todayKey(),
      restModeDate: null,
      settings: { reduceMotion: false },
      _events: []
    };
    return state;
  }

  // ---------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------

  function pushEvent(state, evt) {
    if (!state._events) state._events = [];
    state._events.push(evt);
  }

  function drainEvents(state) {
    var evts = state._events || [];
    state._events = [];
    return evts;
  }

  function hasSkill(state, skillId) {
    return state.character.learnedSkills.indexOf(skillId) !== -1;
  }

  function addXp(state, amount) {
    if (amount <= 0) return 0;
    var c = state.character;
    c.xp += amount;
    state.counters.totalXpEarned += amount;
    var levelsGained = 0;
    while (c.xp >= Data.xpForNextLevel(c.level)) {
      c.xp -= Data.xpForNextLevel(c.level);
      c.level += 1;
      c.skillPoints += 1;
      levelsGained += 1;
    }
    if (levelsGained > 0) {
      pushEvent(state, { type: 'levelup', level: c.level, levelsGained: levelsGained });
    }
    return levelsGained;
  }

  function addGold(state, amount) {
    if (amount === 0) return;
    state.character.gold = Math.max(0, state.character.gold + amount);
    if (amount > 0) state.counters.totalGoldEarned += amount;
  }

  function changeEnergy(state, delta) {
    var c = state.character;
    c.energy = Util.clamp(c.energy + delta, 0, c.maxEnergy);
  }

  function bumpStat(state, statKey, amount) {
    if (!statKey || !state.character.stats.hasOwnProperty(statKey)) return;
    state.character.stats[statKey] += amount;
  }

  function getEffectiveStats(state) {
    var stats = Util.deepClone(state.character.stats);
    Data.EQUIPMENT_SLOTS.forEach(function (slot) {
      var itemId = state.character.equipment[slot];
      if (!itemId) return;
      var item = Data.findShopItem(itemId);
      if (item && item.bonus) stats[item.bonus.stat] = (stats[item.bonus.stat] || 0) + item.bonus.amount;
    });
    return stats;
  }

  function equippedCount(state) {
    var n = 0;
    Data.EQUIPMENT_SLOTS.forEach(function (slot) { if (state.character.equipment[slot]) n++; });
    return n;
  }

  function damageBoss(state, amount) {
    if (amount <= 0) return false;
    state.boss.hp = Math.max(0, state.boss.hp - amount);
    bumpWeeklyProgress(state, 'bossDamage', amount);
    if (state.boss.hp <= 0) {
      defeatBoss(state);
      return true;
    }
    return false;
  }

  function defeatBoss(state) {
    var boss = state.boss;
    var rewardGold = Math.round(boss.maxHp * 0.3);
    var rewardXp = Math.round(boss.maxHp * 0.2);
    addGold(state, rewardGold);
    addXp(state, rewardXp);
    state.defeatedBosses.push({ name: boss.name, emoji: boss.emoji, cycle: boss.cycle, defeatedAt: new Date().toISOString() });
    state.counters.totalBossesDefeated += 1;

    var lootId = rollLoot(state, 3); // guaranteed higher-tier loot chance on boss kill
    pushEvent(state, { type: 'bossdefeated', name: boss.name, emoji: boss.emoji, gold: rewardGold, xp: rewardXp, loot: lootId });

    state.boss = Data.nextBoss(boss);
    checkAchievements(state);
    checkPetUnlocks(state);
  }

  function rollLoot(state, difficulty) {
    var chance = Data.LOOT_CHANCE[difficulty] || 0.1;
    if (hasSkill(state, 'lucky_star')) chance += 0.05;
    if (Math.random() < chance) {
      var pool = Data.POTIONS;
      var potion = pool[Math.floor(Math.random() * pool.length)];
      state.inventory[potion.id] = (state.inventory[potion.id] || 0) + 1;
      return potion.id;
    }
    return null;
  }

  function updateStreakOnActivity(state) {
    var today = Util.todayKey();
    var s = state.streak;
    if (s.lastActiveDate === today) return;
    if (!s.lastActiveDate) {
      s.current = 1;
    } else {
      var diff = Util.dayDiff(s.lastActiveDate, today);
      if (diff === 1) {
        s.current += 1;
      } else if (diff > 1) {
        if (s.shieldCharges > 0) {
          s.shieldCharges -= (hasSkill(state, 'streak_master') ? 0.5 : 1);
          if (s.shieldCharges < 0) s.shieldCharges = 0;
          pushEvent(state, { type: 'streaksaved' });
        } else {
          s.current = Math.max(0, s.current - 1);
        }
      }
    }
    s.lastActiveDate = today;
    if (s.current > s.longest) s.longest = s.current;
  }

  function bumpWeeklyProgress(state, metric, amount) {
    Data.WEEKLY_QUEST_DEFS.forEach(function (def) {
      if (def.metric !== metric) return;
      state.weeklyProgress[def.id] = (state.weeklyProgress[def.id] || 0) + amount;
    });
  }

  function getCounterValue(state, type) {
    switch (type) {
      case 'totalQuestsCompleted': return state.counters.totalQuestsCompleted;
      case 'totalDailyCompleted': return state.counters.totalDailyCompleted;
      case 'totalBossesDefeated': return state.counters.totalBossesDefeated;
      case 'totalGoldEarned': return state.counters.totalGoldEarned;
      case 'totalXpEarned': return state.counters.totalXpEarned;
      case 'studyMinutes': return state.counters.studyMinutes;
      case 'longestStreak': return state.streak.longest;
      case 'level': return state.character.level;
      case 'equippedCount': return equippedCount(state);
      case 'petsOwned': return state.pets.length;
      default: return 0;
    }
  }

  function isAchievementUnlocked(state, achId) {
    return state.achievementsUnlocked.some(function (a) { return a.id === achId; });
  }

  function checkAchievements(state) {
    Data.ACHIEVEMENTS.forEach(function (ach) {
      if (isAchievementUnlocked(state, ach.id)) return;
      if (getCounterValue(state, ach.cond.type) >= ach.cond.value) {
        state.achievementsUnlocked.push({ id: ach.id, unlockedAt: new Date().toISOString() });
        if (ach.rewardGold) addGold(state, ach.rewardGold);
        pushEvent(state, { type: 'achievement', id: ach.id, name: ach.name, emoji: ach.emoji, gold: ach.rewardGold });
      }
    });
  }

  function checkPetUnlocks(state) {
    Data.PETS.forEach(function (pet) {
      var already = state.pets.some(function (p) { return p.id === pet.id; });
      if (already) return;
      if (getCounterValue(state, pet.cond.type) >= pet.cond.value) {
        state.pets.push({ id: pet.id, level: 1, xp: 0, obtainedAt: new Date().toISOString() });
        pushEvent(state, { type: 'pet', id: pet.id, name: pet.name, emoji: pet.emoji });
      }
    });
  }

  function feedActivePet(state, xpAmount) {
    if (!state.character.activePetId) return;
    var pet = state.pets.filter(function (p) { return p.id === state.character.activePetId; })[0];
    if (!pet) return;
    pet.xp += Math.round(xpAmount * 0.1);
    var needed = 50 + (pet.level - 1) * 40;
    while (pet.xp >= needed) {
      pet.xp -= needed;
      pet.level += 1;
      needed = 50 + (pet.level - 1) * 40;
    }
  }

  // ---------------------------------------------------------
  // New-day / new-week rollover
  // ---------------------------------------------------------

  function rollOverIfNeeded(state) {
    var today = Util.todayKey();
    if (state.lastSeenDate !== today) {
      state.character.energy = state.character.maxEnergy;
      state.lastSeenDate = today;
      if (state.restModeDate && state.restModeDate !== today) state.restModeDate = null;
    }
    var wk = Util.getWeekKey(new Date());
    if (state.weekKey !== wk) {
      state.weekKey = wk;
      state.weeklyProgress = {};
      state.weeklyClaimed = {};
    }
  }

  // ---------------------------------------------------------
  // Core reward pipeline shared by every quest type
  // ---------------------------------------------------------

  function grantQuestRewards(state, info) {
    var xp = info.xp;
    var gold = info.gold;

    if (state.activeEffects.xpBoostCharges > 0) {
      xp = Math.round(xp * 1.25);
      state.activeEffects.xpBoostCharges -= 1;
    }
    if (state.activeEffects.luckyChargeCharges > 0) {
      gold = Math.round(gold * 1.5);
      state.activeEffects.luckyChargeCharges -= 1;
    }
    if (info.category === 'focus' && hasSkill(state, 'focus_mastery')) xp = Math.round(xp * 1.1);
    if (info.difficulty === 3 && hasSkill(state, 'deep_work')) xp = Math.round(xp * 1.1);
    if (hasSkill(state, 'iron_discipline')) gold = Math.round(gold * 1.1);

    var energyCost = info.energy || 0;
    if (hasSkill(state, 'quick_hands')) energyCost = Math.round(energyCost * 0.8);

    addXp(state, xp);
    addGold(state, gold);
    if (info.category) bumpStat(state, info.category, 1);
    changeEnergy(state, -energyCost);
    feedActivePet(state, xp);
    damageBoss(state, xp);

    if (info.durationMinutes && info.category === 'intelligence') {
      state.counters.studyMinutes += info.durationMinutes;
    }

    state.counters.totalQuestsCompleted += 1;
    if (info.isDaily) state.counters.totalDailyCompleted += 1;

    updateStreakOnActivity(state);
    bumpWeeklyProgress(state, 'questsCompleted', 1);

    var lootId = rollLoot(state, info.difficulty || 1);

    state.questLog.unshift({
      id: Util.uid('log'), title: info.title, emoji: info.emoji || '📌',
      category: info.category, type: info.type, xp: xp, gold: gold,
      loot: lootId, completedAt: new Date().toISOString()
    });
    if (state.questLog.length > 400) state.questLog.length = 400;

    pushEvent(state, {
      type: 'quest', title: info.title, emoji: info.emoji, xp: xp, gold: gold, loot: lootId
    });

    checkAchievements(state);
    checkPetUnlocks(state);

    return { xp: xp, gold: gold, lootId: lootId };
  }

  // ---------------------------------------------------------
  // Quest actions (public)
  // ---------------------------------------------------------

  function completeDailyQuest(state, questId) {
    var today = Util.todayKey();
    if (state.dailyCompletions[questId] === today) return null; // already done today
    var q = state.quests.daily.filter(function (x) { return x.id === questId; })[0];
    if (!q) return null;
    state.dailyCompletions[questId] = today;
    return grantQuestRewards(state, {
      title: q.title, emoji: q.emoji, category: q.category, type: 'daily',
      difficulty: q.difficulty, xp: q.xp, gold: q.gold, energy: q.energy, isDaily: true,
      durationMinutes: q.durationMinutes
    });
  }

  function uncompleteDailyQuest(state, questId) {
    var today = Util.todayKey();
    if (state.dailyCompletions[questId] !== today) return;
    delete state.dailyCompletions[questId];
    // Intentionally not refunding rewards — undo is meant for mis-clicks,
    // not grinding. Keeping it simple & honour-system based.
  }

  function isDailyDoneToday(state, questId) {
    return state.dailyCompletions[questId] === Util.todayKey();
  }

  function completeSideQuest(state, questId) {
    var q = state.quests.side.filter(function (x) { return x.id === questId; })[0];
    if (!q) return null;
    var result = grantQuestRewards(state, {
      title: q.title, emoji: q.emoji, category: q.category, type: 'side',
      difficulty: q.difficulty, xp: q.xp, gold: q.gold, energy: q.energy,
      durationMinutes: q.durationMinutes
    });
    state.quests.side = state.quests.side.filter(function (x) { return x.id !== questId; });
    return result;
  }

  function completeMainStep(state, mainId, stepId) {
    var main = state.quests.main.filter(function (x) { return x.id === mainId; })[0];
    if (!main || main.completed) return null;
    var step = main.steps.filter(function (x) { return x.id === stepId; })[0];
    if (!step || step.done) return null;
    step.done = true;

    var d = Data.DIFFICULTY[2];
    var result = grantQuestRewards(state, {
      title: main.title + ': ' + step.title, emoji: main.emoji, category: main.category, type: 'main',
      difficulty: 2, xp: Math.round(d.xp * Data.TYPE_MULTIPLIER.main), gold: Math.round(d.gold * Data.TYPE_MULTIPLIER.main),
      energy: d.energy
    });

    var allDone = main.steps.every(function (s) { return s.done; });
    if (allDone) {
      main.completed = true;
      main.completedAt = new Date().toISOString();
      addXp(state, main.bonusXp || 0);
      addGold(state, main.bonusGold || 0);
      state.counters.totalQuestsCompleted += 1;
      pushEvent(state, { type: 'mainquest', title: main.title, xp: main.bonusXp, gold: main.bonusGold });
      checkAchievements(state);
    }
    return result;
  }

  function claimWeeklyQuest(state, defId) {
    var def = Data.WEEKLY_QUEST_DEFS.filter(function (d) { return d.id === defId; })[0];
    if (!def) return null;
    var progress = state.weeklyProgress[defId] || 0;
    if (progress < def.target) return null;
    if (state.weeklyClaimed[defId]) return null;
    state.weeklyClaimed[defId] = true;
    addXp(state, def.xp);
    addGold(state, def.gold);
    pushEvent(state, { type: 'weekly', title: def.title, emoji: def.emoji, xp: def.xp, gold: def.gold });
    checkAchievements(state);
    return { xp: def.xp, gold: def.gold };
  }

  // ---------------------------------------------------------
  // Quest management (create / delete)
  // ---------------------------------------------------------

  function addCustomQuest(state, type, payload) {
    var d = Data.DIFFICULTY[payload.difficulty] || Data.DIFFICULTY[1];
    if (type === 'daily') {
      state.quests.daily.push({
        id: Util.uid('dq'), title: payload.title.slice(0, 60), emoji: payload.emoji || '📌',
        category: payload.category, difficulty: payload.difficulty,
        xp: d.xp, gold: d.gold, energy: d.energy, durationMinutes: payload.durationMinutes || null
      });
    } else if (type === 'side') {
      state.quests.side.push({
        id: Util.uid('sq'), title: payload.title.slice(0, 60), emoji: payload.emoji || '📌',
        category: payload.category, difficulty: payload.difficulty,
        xp: Math.round(d.xp * Data.TYPE_MULTIPLIER.side), gold: Math.round(d.gold * Data.TYPE_MULTIPLIER.side),
        energy: d.energy, durationMinutes: payload.durationMinutes || null
      });
    } else if (type === 'main') {
      var steps = (payload.steps || []).filter(function (s) { return s && s.trim(); });
      if (!steps.length) steps = ['Step 1'];
      state.quests.main.push({
        id: Util.uid('mq'), title: payload.title.slice(0, 60), emoji: payload.emoji || '⚔️',
        category: payload.category,
        steps: steps.map(function (label) { return { id: Util.uid('step'), title: label.slice(0, 60), done: false }; }),
        bonusXp: 100 + steps.length * 20, bonusGold: 50 + steps.length * 10,
        completed: false, completedAt: null
      });
    }
    pushEvent(state, { type: 'questadded', title: payload.title });
  }

  function deleteQuest(state, type, questId) {
    if (type === 'daily') state.quests.daily = state.quests.daily.filter(function (q) { return q.id !== questId; });
    if (type === 'side') state.quests.side = state.quests.side.filter(function (q) { return q.id !== questId; });
    if (type === 'main') state.quests.main = state.quests.main.filter(function (q) { return q.id !== questId; });
  }

  // ---------------------------------------------------------
  // Shop / inventory / equipment
  // ---------------------------------------------------------

  function buyItem(state, itemId) {
    var item = Data.findItemAnywhere(itemId);
    if (!item) return false;
    if (state.character.gold < item.cost) {
      pushEvent(state, { type: 'error', message: 'Not enough Gold' });
      return false;
    }
    addGold(state, -item.cost);
    state.inventory[itemId] = (state.inventory[itemId] || 0) + 1;
    pushEvent(state, { type: 'purchase', name: item.name, emoji: item.emoji });
    return true;
  }

  function equipItem(state, itemId) {
    var item = Data.findShopItem(itemId);
    if (!item) return false;
    if (!state.inventory[itemId]) return false;
    state.character.equipment[item.slot] = itemId;
    checkAchievements(state);
    return true;
  }

  function unequipSlot(state, slot) {
    state.character.equipment[slot] = null;
  }

  function usePotion(state, itemId) {
    var potion = Data.findPotion(itemId);
    if (!potion || !state.inventory[itemId]) return false;
    state.inventory[itemId] -= 1;
    if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
    if (potion.effect === 'xpBoost') state.activeEffects.xpBoostCharges += 3;
    if (potion.effect === 'streakShield') state.streak.shieldCharges += 1;
    if (potion.effect === 'luckyCharge') state.activeEffects.luckyChargeCharges += 1;
    pushEvent(state, { type: 'potion', name: potion.name, emoji: potion.emoji });
    return true;
  }

  function setActivePet(state, petId) {
    var owns = state.pets.some(function (p) { return p.id === petId; });
    state.character.activePetId = owns ? petId : null;
  }

  // ---------------------------------------------------------
  // Skills
  // ---------------------------------------------------------

  function learnSkill(state, skillId) {
    var skill = Data.findSkill(skillId);
    if (!skill) return false;
    if (hasSkill(state, skillId)) return false;
    if (state.character.skillPoints < skill.cost) return false;
    state.character.skillPoints -= skill.cost;
    state.character.learnedSkills.push(skillId);
    pushEvent(state, { type: 'skill', name: skill.name, emoji: skill.emoji });
    return true;
  }

  // ---------------------------------------------------------
  // Misc
  // ---------------------------------------------------------

  function toggleRestMode(state) {
    var today = Util.todayKey();
    state.restModeDate = (state.restModeDate === today) ? null : today;
  }

  function renameCharacter(state, name) {
    state.character.name = (name || 'Hero').trim().slice(0, 24) || 'Hero';
  }

  function setAvatar(state, avatar) {
    state.character.avatar = avatar;
  }

  var State = {
    createCharacter: createCharacter,
    drainEvents: drainEvents,
    rollOverIfNeeded: rollOverIfNeeded,
    getEffectiveStats: getEffectiveStats,
    equippedCount: equippedCount,
    hasSkill: hasSkill,
    isAchievementUnlocked: isAchievementUnlocked,
    getCounterValue: getCounterValue,
    isDailyDoneToday: isDailyDoneToday,
    // actions
    completeDailyQuest: completeDailyQuest,
    uncompleteDailyQuest: uncompleteDailyQuest,
    completeSideQuest: completeSideQuest,
    completeMainStep: completeMainStep,
    claimWeeklyQuest: claimWeeklyQuest,
    addCustomQuest: addCustomQuest,
    deleteQuest: deleteQuest,
    buyItem: buyItem,
    equipItem: equipItem,
    unequipSlot: unequipSlot,
    usePotion: usePotion,
    setActivePet: setActivePet,
    learnSkill: learnSkill,
    toggleRestMode: toggleRestMode,
    renameCharacter: renameCharacter,
    setAvatar: setAvatar,
    // low level (exposed for tests / advanced UI needs)
    addXp: addXp,
    addGold: addGold,
    damageBoss: damageBoss
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = State;
  }
  global.LQ = global.LQ || {};
  global.LQ.State = State;
})(typeof window !== 'undefined' ? window : global);