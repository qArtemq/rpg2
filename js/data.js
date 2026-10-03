/* ============================================================
   LifeQuest RPG — data.js
   Static game data: stats, classes, quests, bosses, items,
   potions, achievements, pets, skills, world map.
   Pure data + small pure helpers. No DOM access.
   ============================================================ */
(function (global) {
  'use strict';

  // ---------- Core stats (the "character sheet") ----------
  var STATS = [
    { key: 'vitality', emoji: '❤️', label: 'Vitality', grows: 'sport, sleep, health' },
    { key: 'intelligence', emoji: '🧠', label: 'Intelligence', grows: 'study, reading' },
    { key: 'strength', emoji: '💪', label: 'Strength', grows: 'workouts' },
    { key: 'agility', emoji: '⚡', label: 'Agility', grows: 'activity, movement' },
    { key: 'focus', emoji: '🎯', label: 'Focus', grows: 'work, concentration' },
    { key: 'wealth', emoji: '💰', label: 'Wealth', grows: 'work, finances' },
    { key: 'discipline', emoji: '🧘', label: 'Discipline', grows: 'daily habits' },
    { key: 'luck', emoji: '🍀', label: 'Luck', grows: 'achievements, streaks' }
  ];

  function statMeta(key) {
    for (var i = 0; i < STATS.length; i++) if (STATS[i].key === key) return STATS[i];
    return null;
  }

  // ---------- Classes ----------
  // Classes no longer lock you forever — they just give flavor + a small
  // starting push. Who you become is shaped by what you actually do.
  var CLASSES = {
    warrior: {
      id: 'warrior', name: 'Warrior', emoji: '🗡️', color: '#e0563b',
      tagline: 'Strength through action.',
      statBonuses: { strength: 5, vitality: 3, discipline: 2 }
    },
    mage: {
      id: 'mage', name: 'Mage', emoji: '🧙', color: '#6c6cf2',
      tagline: 'Knowledge is power.',
      statBonuses: { intelligence: 5, focus: 3, luck: 2 }
    },
    rogue: {
      id: 'rogue', name: 'Rogue', emoji: '🥷', color: '#2fbf84',
      tagline: 'Fast, lucky, unstoppable.',
      statBonuses: { agility: 5, luck: 3, wealth: 2 }
    }
  };

  var AVATARS = ['🧙', '🗡️', '🥷', '🧝', '🧛', '🧟', '🦸', '🧞', '🤺', '👩‍🚀', '🧑‍🚀', '🐉'];

  // ---------- Difficulty / reward curve ----------
  var DIFFICULTY = {
    1: { stars: '⭐', xp: 15, gold: 6, energy: 5 },
    2: { stars: '⭐⭐', xp: 35, gold: 14, energy: 10 },
    3: { stars: '⭐⭐⭐', xp: 70, gold: 28, energy: 20 }
  };

  var TYPE_MULTIPLIER = { daily: 1, side: 1.1, main: 1.5, weekly: 2 };

  function xpForNextLevel(level) {
    return 90 + (level - 1) * 40;
  }

  // ---------- Starter quests (seed content for a new hero) ----------
  // Numbers deliberately mirror the LifeQuest home-screen mock-up.
  var STARTER_DAILY = [
    { title: 'Drink water', emoji: '💧', category: 'vitality', difficulty: 1, xp: 10, gold: 4, energy: 2 },
    { title: 'Study German', emoji: '📚', category: 'intelligence', difficulty: 2, xp: 50, gold: 20, energy: 10 },
    { title: 'Workout', emoji: '🏋️', category: 'strength', difficulty: 3, xp: 80, gold: 32, energy: 20 },
    { title: 'Clean room', emoji: '🧹', category: 'discipline', difficulty: 1, xp: 30, gold: 12, energy: 8 }
  ];

  var STARTER_SIDE = [
    { title: 'Buy groceries', emoji: '🛒', category: 'wealth', difficulty: 1 },
    { title: 'Deep clean the kitchen', emoji: '🧽', category: 'discipline', difficulty: 2 }
  ];

  var STARTER_MAIN = [
    {
      title: 'Path of the Developer', emoji: '⚔️', category: 'focus',
      steps: [
        'Come up with the idea',
        'Make the design',
        'Write the MVP',
        'Test it',
        'Publish it'
      ],
      bonusXp: 200, bonusGold: 100
    }
  ];

  var WEEKLY_QUEST_DEFS = [
    { id: 'w_grind', title: 'Weekly Grind', emoji: '🏆', metric: 'questsCompleted', target: 20, xp: 150, gold: 80 },
    { id: 'w_bosshunter', title: 'Boss Hunter', emoji: '💥', metric: 'bossDamage', target: 300, xp: 120, gold: 60 }
  ];

  // ---------- Bosses ----------
  // HP scales up every time the full rotation has been cleared once
  // (the "cycle"), so there is always a next fight worth having.
  var BOSS_ROTATION = [
    { name: 'Laziness', emoji: '😴', hp: 400 },
    { name: 'Procrastination', emoji: '🌀', hp: 650 },
    { name: 'Chaos', emoji: '💀', hp: 900 },
    { name: 'Debts', emoji: '💸', hp: 1200 },
    { name: 'Exam', emoji: '📝', hp: 1500 },
    { name: 'Big Project', emoji: '🏗️', hp: 2000 },
    { name: 'Week of Work', emoji: '📅', hp: 2500 }
  ];

  function spawnBoss(index, cycle) {
    var base = BOSS_ROTATION[index % BOSS_ROTATION.length];
    var hp = Math.round(base.hp * Math.pow(1.4, cycle - 1));
    return {
      name: base.name, emoji: base.emoji,
      index: index % BOSS_ROTATION.length, cycle: cycle,
      maxHp: hp, hp: hp
    };
  }

  function nextBoss(prev) {
    var idx = prev.index + 1;
    var cycle = prev.cycle;
    if (idx >= BOSS_ROTATION.length) { idx = 0; cycle += 1; }
    return spawnBoss(idx, cycle);
  }

  // ---------- Equipment (shop) ----------
  var SHOP_ITEMS = [
    { id: 'i_iron_sword', name: 'Iron Sword', emoji: '⚔️', slot: 'weapon', cost: 150, bonus: { stat: 'strength', amount: 3 }, desc: '+3 Strength' },
    { id: 'i_wooden_shield', name: 'Wooden Shield', emoji: '🛡️', slot: 'armor', cost: 120, bonus: { stat: 'vitality', amount: 5 }, desc: '+5 Vitality' },
    { id: 'i_traveler_boots', name: 'Traveler Boots', emoji: '👟', slot: 'boots', cost: 100, bonus: { stat: 'agility', amount: 2 }, desc: '+2 Agility' },
    { id: 'i_leather_gloves', name: 'Leather Gloves', emoji: '🧤', slot: 'gloves', cost: 90, bonus: { stat: 'strength', amount: 2 }, desc: '+2 Strength' },
    { id: 'i_adventurer_backpack', name: 'Adventurer Backpack', emoji: '🎒', slot: 'backpack', cost: 130, bonus: { stat: 'wealth', amount: 3 }, desc: '+3 Wealth' },
    { id: 'i_arcane_charm', name: 'Arcane Charm', emoji: '🔮', slot: 'trinket', cost: 140, bonus: { stat: 'intelligence', amount: 3 }, desc: '+3 Intelligence' },
    { id: 'i_focus_beads', name: 'Focus Beads', emoji: '📿', slot: 'trinket', cost: 110, bonus: { stat: 'focus', amount: 3 }, desc: '+3 Focus' },
    { id: 'i_lucky_coin', name: 'Lucky Coin', emoji: '🪩', slot: 'trinket', cost: 160, bonus: { stat: 'luck', amount: 3 }, desc: '+3 Luck' }
  ];

  var EQUIPMENT_SLOTS = ['weapon', 'armor', 'gloves', 'boots', 'backpack', 'trinket'];

  function findShopItem(id) {
    for (var i = 0; i < SHOP_ITEMS.length; i++) if (SHOP_ITEMS[i].id === id) return SHOP_ITEMS[i];
    return null;
  }

  // ---------- Potions (consumables) ----------
  var POTIONS = [
    { id: 'p_xp', name: 'XP Potion', emoji: '🧪', cost: 80, effect: 'xpBoost', desc: '+25% XP on your next 3 quests' },
    { id: 'p_shield', name: 'Shield Potion', emoji: '🛡️', cost: 100, effect: 'streakShield', desc: 'Protects your streak from one missed day' },
    { id: 'p_lucky', name: 'Lucky Potion', emoji: '🍀', cost: 80, effect: 'luckyCharge', desc: '+50% Gold on your next quest' }
  ];

  function findPotion(id) {
    for (var i = 0; i < POTIONS.length; i++) if (POTIONS[i].id === id) return POTIONS[i];
    return null;
  }

  function findItemAnywhere(id) {
    return findShopItem(id) || findPotion(id);
  }

  // ---------- Achievements ----------
  var ACHIEVEMENTS = [
    { id: 'a_first_blood', name: 'First Blood', emoji: '🥉', desc: 'Complete your first quest.', cond: { type: 'totalQuestsCompleted', value: 1 }, rewardGold: 20 },
    { id: 'a_adventurer', name: 'Adventurer', emoji: '⚔️', desc: 'Complete 100 quests.', cond: { type: 'totalQuestsCompleted', value: 100 }, rewardGold: 150 },
    { id: 'a_unstoppable', name: 'Unstoppable', emoji: '🔥', desc: 'Reach a 7 day streak.', cond: { type: 'longestStreak', value: 7 }, rewardGold: 100 },
    { id: 'a_legendary_streak', name: 'Legendary', emoji: '🌟', desc: 'Reach a 30 day streak.', cond: { type: 'longestStreak', value: 30 }, rewardGold: 400 },
    { id: 'a_boss_slayer', name: 'Boss Slayer', emoji: '💀', desc: 'Defeat your first boss.', cond: { type: 'totalBossesDefeated', value: 1 }, rewardGold: 100 },
    { id: 'a_boss_hunter', name: 'Boss Hunter', emoji: '🐲', desc: 'Defeat 10 bosses.', cond: { type: 'totalBossesDefeated', value: 10 }, rewardGold: 300 },
    { id: 'a_scholar', name: 'Scholar', emoji: '🧠', desc: 'Study for 100 hours in total.', cond: { type: 'studyMinutes', value: 6000 }, rewardGold: 250 },
    { id: 'a_millionaire', name: 'Millionaire', emoji: '💰', desc: 'Earn 10,000 Gold over your adventures.', cond: { type: 'totalGoldEarned', value: 10000 }, rewardGold: 500 },
    { id: 'a_centurion', name: 'Centurion', emoji: '🏅', desc: 'Reach character level 10.', cond: { type: 'level', value: 10 }, rewardGold: 200 },
    { id: 'a_well_equipped', name: 'Well Equipped', emoji: '🛡️', desc: 'Have 4 items equipped at once.', cond: { type: 'equippedCount', value: 4 }, rewardGold: 80 },
    { id: 'a_beastmaster', name: 'Beastmaster', emoji: '🐺', desc: 'Earn your first companion.', cond: { type: 'petsOwned', value: 1 }, rewardGold: 60 }
  ];

  // ---------- Pets ----------
  var PETS = [
    { id: 'pet_wolf', name: 'Wolf', emoji: '🐺', cond: { type: 'longestStreak', value: 7 }, desc: '7 day streak' },
    { id: 'pet_cat', name: 'Cat', emoji: '🐱', cond: { type: 'totalDailyCompleted', value: 50 }, desc: '50 daily quests completed' },
    { id: 'pet_dragon', name: 'Baby Dragon', emoji: '🐲', cond: { type: 'totalXpEarned', value: 1000 }, desc: '1000 lifetime XP' },
    { id: 'pet_raccoon', name: 'Raccoon', emoji: '🦝', cond: { type: 'totalBossesDefeated', value: 5 }, desc: 'Defeat 5 bosses' }
  ];

  function findPetDef(id) {
    for (var i = 0; i < PETS.length; i++) if (PETS[i].id === id) return PETS[i];
    return null;
  }

  // ---------- Skills (lightweight skill tree) ----------
  var SKILLS = [
    { id: 'focus_mastery', name: 'Focus Mastery', emoji: '🎯', branch: 'Focus', desc: '+10% XP from Focus quests', cost: 1 },
    { id: 'deep_work', name: 'Deep Work', emoji: '🌊', branch: 'Focus', desc: '+10% XP from long (★★★) quests', cost: 1 },
    { id: 'iron_discipline', name: 'Iron Discipline', emoji: '🧘', branch: 'Discipline', desc: '+10% Gold from all quests', cost: 1 },
    { id: 'streak_master', name: 'Streak Master', emoji: '🔥', branch: 'Discipline', desc: 'Streak shields are 50% more effective (never used up fully)', cost: 1 },
    { id: 'quick_hands', name: 'Quick Tasks', emoji: '⚡', branch: 'Speed', desc: '-20% Energy cost on all quests', cost: 1 },
    { id: 'lucky_star', name: 'Lucky Star', emoji: '🍀', branch: 'Speed', desc: '+5% chance to find loot', cost: 1 }
  ];

  function findSkill(id) {
    for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i].id === id) return SKILLS[i];
    return null;
  }

  // ---------- World map ----------
  var WORLD_REGIONS = [
    { id: 'home', name: 'Home', emoji: '🏠', requiredLevel: 1, category: null },
    { id: 'village', name: 'Village', emoji: '🏘️', requiredLevel: 1, category: 'discipline' },
    { id: 'training', name: 'Training Grounds', emoji: '🏟️', requiredLevel: 1, category: 'strength' },
    { id: 'mountain', name: 'Mountain of Knowledge', emoji: '🏔️', requiredLevel: 2, category: 'intelligence' },
    { id: 'market', name: 'Market', emoji: '💰', requiredLevel: 3, category: 'wealth' },
    { id: 'forest', name: 'Dark Forest', emoji: '🌲', requiredLevel: 5, category: 'agility' },
    { id: 'dungeon', name: 'Dungeon', emoji: '👹', requiredLevel: 1, category: null, isBoss: true },
    { id: 'capital', name: 'Capital', emoji: '🏰', requiredLevel: 10, category: 'focus' }
  ];

  // ---------- Loot roll chance by difficulty ----------
  var LOOT_CHANCE = { 1: 0.10, 2: 0.15, 3: 0.20 };

  var Data = {
    STATS: STATS,
    statMeta: statMeta,
    CLASSES: CLASSES,
    AVATARS: AVATARS,
    DIFFICULTY: DIFFICULTY,
    TYPE_MULTIPLIER: TYPE_MULTIPLIER,
    xpForNextLevel: xpForNextLevel,
    STARTER_DAILY: STARTER_DAILY,
    STARTER_SIDE: STARTER_SIDE,
    STARTER_MAIN: STARTER_MAIN,
    WEEKLY_QUEST_DEFS: WEEKLY_QUEST_DEFS,
    BOSS_ROTATION: BOSS_ROTATION,
    spawnBoss: spawnBoss,
    nextBoss: nextBoss,
    SHOP_ITEMS: SHOP_ITEMS,
    EQUIPMENT_SLOTS: EQUIPMENT_SLOTS,
    findShopItem: findShopItem,
    POTIONS: POTIONS,
    findPotion: findPotion,
    findItemAnywhere: findItemAnywhere,
    ACHIEVEMENTS: ACHIEVEMENTS,
    PETS: PETS,
    findPetDef: findPetDef,
    SKILLS: SKILLS,
    findSkill: findSkill,
    WORLD_REGIONS: WORLD_REGIONS,
    LOOT_CHANCE: LOOT_CHANCE
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Data;
  }
  global.LQ = global.LQ || {};
  global.LQ.Data = Data;
})(typeof window !== 'undefined' ? window : global);
