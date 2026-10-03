/* ============================================================
   LifeQuest RPG — app.js
   Wires state.js (engine) to ui.js/modals.js (render) via a
   single delegated event listener. Owns the small amount of
   ephemeral UI state that never gets persisted (current view,
   open tabs, open modal, in-progress add-quest form draft).
   ============================================================ */
(function () {
  'use strict';

  var Util = window.LQ.Util;
  var Data = window.LQ.Data;
  var State = window.LQ.State;
  var Storage = window.LQ.Storage;
  var UI = window.LQ.UI;
  var Modals = window.LQ.Modals;

  var state = null;

  function defaultCtx() {
    var now = new Date();
    return {
      view: 'home',
      questTab: 'daily',
      questFilterCategory: null,
      invTab: 'equipment',
      modal: null,
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth(),
      calendarSelectedDate: null,
      settingsAvatarPick: null,
      addQuestDraft: null,
      onboardingForm: { name: '', classId: 'warrior', avatar: Data.CLASSES.warrior.emoji }
    };
  }
  var ctx = defaultCtx();

  // ---------------------------------------------------------
  // DOM roots
  // ---------------------------------------------------------

  var $header, $view, $nav, $modal, $toast;

  function cacheStaticRoots() {
    $modal = document.getElementById('modal-root');
    $toast = document.getElementById('toast-root');
  }

  function cacheAppRoots() {
    $header = document.getElementById('header-root');
    $view = document.getElementById('view-root');
    $nav = document.getElementById('nav-root');
  }

  // ---------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------

  function currentViewHtml() {
    switch (ctx.view) {
      case 'home': return UI.renderHome(state);
      case 'world': return UI.renderWorld(state);
      case 'quests': return UI.renderQuests(state, ctx);
      case 'character': return UI.renderCharacter(state);
      case 'inventory': return UI.renderInventory(state, ctx);
      default: return UI.renderHome(state);
    }
  }

  function currentModalHtml() {
    switch (ctx.modal) {
      case 'achievements': return Modals.renderAchievementsModal(state);
      case 'calendar': return Modals.renderCalendarModal(state, ctx);
      case 'stats': return Modals.renderStatsModal(state);
      case 'settings': return Modals.renderSettingsModal(state);
      case 'boss': return Modals.renderBossModal(state);
      case 'addquest': return Modals.renderAddQuestModal(state, ctx);
      default: return '';
    }
  }

  function refreshHeader() { $header.innerHTML = UI.renderHeader(state); }
  function refreshNav() { $nav.innerHTML = UI.renderNav(ctx.view); }
  function refreshView() { $view.innerHTML = currentViewHtml(); }
  function refreshModal() { if (ctx.modal) $modal.innerHTML = currentModalHtml(); }

  function renderOnboardingScreen() {
    document.getElementById('app-root').innerHTML = UI.renderOnboarding(ctx.onboardingForm);
  }

  function renderAppShell() {
    document.getElementById('app-root').innerHTML =
      '<div class="lq-app">' +
      '<div id="header-root"></div>' +
      '<main id="view-root" class="lq-main"></main>' +
      '<div id="nav-root"></div>' +
      '</div>';
    cacheAppRoots();
    refreshHeader();
    refreshView();
    refreshNav();
  }

  function setView(name) {
    ctx.view = name;
    refreshNav();
    refreshView();
    window.scrollTo(0, 0);
  }

  function openModal(name, data) {
    ctx.modal = name;
    if (name === 'calendar') {
      ctx.calendarSelectedDate = null;
    }
    if (name === 'addquest') {
      var type = (data && data.type) || 'daily';
      if (type !== 'daily' && type !== 'side' && type !== 'main') type = 'daily';
      ctx.addQuestDraft = { type: type, title: '', emoji: '📌', category: 'discipline', difficulty: 2, durationMinutes: '', steps: ['', ''] };
    }
    $modal.innerHTML = currentModalHtml();
    document.body.classList.add('lq-no-scroll');
  }

  function closeModalTo(viewName) {
    ctx.modal = null;
    ctx.calendarSelectedDate = null;
    ctx.settingsAvatarPick = null;
    if (viewName) ctx.view = viewName;
    $modal.innerHTML = '';
    document.body.classList.remove('lq-no-scroll');
    refreshHeader();
    refreshNav();
    refreshView();
  }

  function closeModal() { closeModalTo(null); }

  // ---------------------------------------------------------
  // Toasts
  // ---------------------------------------------------------

  var toastQueue = [];
  var toastBusy = false;

  function showToast(evt) {
    toastQueue.push(evt);
    pumpToastQueue();
  }

  function pumpToastQueue() {
    if (toastBusy || !toastQueue.length) return;
    toastBusy = true;
    var evt = toastQueue.shift();
    var content = Modals.toastContent(evt);
    var el = document.createElement('div');
    el.className = 'lq-toast';
    el.innerHTML = '<span class="lq-toast__emoji">' + content.emoji + '</span><span class="lq-toast__text">' + content.text + '</span>';
    $toast.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-visible'); });
    setTimeout(function () {
      el.classList.remove('is-visible');
      setTimeout(function () {
        el.remove();
        toastBusy = false;
        pumpToastQueue();
      }, 250);
    }, 2500);
  }

  // After any state-mutating action: drain events -> toast them, persist, repaint.
  function afterAction() {
    var events = State.drainEvents(state);
    events.forEach(showToast);
    Storage.save(state);
    refreshHeader();
    if (ctx.modal) refreshModal(); else refreshView();
  }

  // ---------------------------------------------------------
  // Event delegation — click
  // ---------------------------------------------------------

  function onClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el) {
      if (e.target.id === 'modal-overlay') closeModal();
      return;
    }
    var action = el.dataset.action;

    switch (action) {

      // --- Onboarding ---
      case 'select-class':
        ctx.onboardingForm.classId = el.dataset.class;
        ctx.onboardingForm.avatar = Data.CLASSES[el.dataset.class].emoji;
        renderOnboardingScreen();
        break;
      case 'select-avatar':
        ctx.onboardingForm.avatar = el.dataset.avatar;
        renderOnboardingScreen();
        break;
      case 'begin-adventure': {
        var nameInput = document.getElementById('hero-name');
        var heroName = nameInput ? nameInput.value : ctx.onboardingForm.name;
        state = State.createCharacter(heroName, ctx.onboardingForm.classId, ctx.onboardingForm.avatar);
        State.rollOverIfNeeded(state);
        Storage.save(state);
        ctx.view = 'home';
        renderAppShell();
        break;
      }

      // --- Navigation ---
      case 'nav-view':
        if (el.dataset.view === 'quests') ctx.questFilterCategory = null;
        setView(el.dataset.view);
        break;
      case 'open-modal':
        openModal(el.dataset.modal, { type: el.dataset.type });
        break;
      case 'close-modal':
        closeModal();
        break;

      // --- Home ---
      case 'toggle-daily':
        if (State.isDailyDoneToday(state, el.dataset.id)) {
          State.uncompleteDailyQuest(state, el.dataset.id);
          Storage.save(state);
          refreshHeader();
          if (ctx.modal) refreshModal(); else refreshView();
        } else {
          State.completeDailyQuest(state, el.dataset.id);
          afterAction();
        }
        break;
      case 'toggle-restmode':
        State.toggleRestMode(state);
        Storage.save(state);
        refreshView();
        break;

      // --- World ---
      case 'region-click': {
        var region = Data.WORLD_REGIONS.filter(function (r) { return r.id === el.dataset.region; })[0];
        if (!region) break;
        if (region.isBoss) {
          openModal('boss');
        } else if (region.id === 'home') {
          setView('home');
        } else {
          ctx.questFilterCategory = region.category || null;
          ctx.questTab = 'daily';
          setView('quests');
        }
        break;
      }

      // --- Quests ---
      case 'quest-tab':
        ctx.questTab = el.dataset.tab;
        ctx.questFilterCategory = null;
        refreshView();
        break;
      case 'clear-quest-filter':
        ctx.questFilterCategory = null;
        refreshView();
        break;
      case 'complete-side':
        State.completeSideQuest(state, el.dataset.id);
        afterAction();
        break;
      case 'complete-mainstep':
        State.completeMainStep(state, el.dataset.main, el.dataset.step);
        afterAction();
        break;
      case 'claim-weekly':
        State.claimWeeklyQuest(state, el.dataset.id);
        afterAction();
        break;
      case 'delete-quest':
        State.deleteQuest(state, el.dataset.type, el.dataset.id);
        Storage.save(state);
        refreshView();
        break;

      // --- Character ---
      case 'learn-skill':
        State.learnSkill(state, el.dataset.skill);
        afterAction();
        break;
      case 'set-active-pet':
        State.setActivePet(state, el.dataset.pet);
        afterAction();
        break;

      // --- Inventory ---
      case 'inv-tab':
        ctx.invTab = el.dataset.tab;
        refreshView();
        break;
      case 'equip-item':
        State.equipItem(state, el.dataset.item);
        afterAction();
        break;
      case 'unequip-slot':
        State.unequipSlot(state, el.dataset.slot);
        afterAction();
        break;
      case 'buy-item':
        State.buyItem(state, el.dataset.item);
        afterAction();
        break;
      case 'use-potion':
        State.usePotion(state, el.dataset.item);
        afterAction();
        break;

      // --- Calendar modal ---
      case 'calendar-prev':
        ctx.calendarMonth -= 1;
        if (ctx.calendarMonth < 0) { ctx.calendarMonth = 11; ctx.calendarYear -= 1; }
        ctx.calendarSelectedDate = null;
        refreshModal();
        break;
      case 'calendar-next':
        ctx.calendarMonth += 1;
        if (ctx.calendarMonth > 11) { ctx.calendarMonth = 0; ctx.calendarYear += 1; }
        ctx.calendarSelectedDate = null;
        refreshModal();
        break;
      case 'calendar-day':
        ctx.calendarSelectedDate = (ctx.calendarSelectedDate === el.dataset.date) ? null : el.dataset.date;
        refreshModal();
        break;

      // --- Settings modal ---
      case 'pick-settings-avatar': {
        ctx.settingsAvatarPick = el.dataset.avatar;
        var grid = el.parentElement;
        Array.prototype.forEach.call(grid.children, function (btn) { btn.classList.remove('is-active'); });
        el.classList.add('is-active');
        break;
      }
      case 'save-settings': {
        var nameEl = document.getElementById('settings-name');
        if (nameEl) State.renameCharacter(state, nameEl.value);
        if (ctx.settingsAvatarPick) State.setAvatar(state, ctx.settingsAvatarPick);
        closeModal();
        Storage.save(state);
        break;
      }
      case 'export-save': {
        var json = Storage.exportJSON(state);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'lifequest-save-' + Util.todayKey() + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        showToast({ type: 'info', emoji: '⬇️', text: 'Save exported' });
        break;
      }
      case 'trigger-import':
        document.getElementById('import-file-input').click();
        break;
      case 'reset-progress':
        if (window.confirm('This will permanently delete your hero and all progress. Are you sure?')) {
          Storage.clear();
          state = null;
          ctx = defaultCtx();
          $modal.innerHTML = '';
          document.body.classList.remove('lq-no-scroll');
          renderOnboardingScreen();
        }
        break;

      // --- Add quest modal ---
      case 'addquest-type':
        ctx.addQuestDraft.type = el.dataset.type;
        if (ctx.addQuestDraft.type === 'main' && (!ctx.addQuestDraft.steps || !ctx.addQuestDraft.steps.length)) {
          ctx.addQuestDraft.steps = ['', ''];
        }
        refreshModal();
        break;
      case 'addquest-step-add':
        ctx.addQuestDraft.steps.push('');
        refreshModal();
        break;
      case 'addquest-step-remove':
        ctx.addQuestDraft.steps.splice(Number(el.dataset.index), 1);
        if (!ctx.addQuestDraft.steps.length) ctx.addQuestDraft.steps = [''];
        refreshModal();
        break;
      case 'addquest-submit': {
        var draft = ctx.addQuestDraft;
        var errEl = document.getElementById('addquest-error');
        if (!draft.title || !draft.title.trim()) {
          if (errEl) errEl.textContent = 'Please enter a title for your quest.';
          break;
        }
        var payload = {
          title: draft.title.trim(),
          emoji: (draft.emoji && draft.emoji.trim()) ? draft.emoji.trim() : '📌',
          category: draft.category,
          difficulty: Number(draft.difficulty) || 2,
          durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : null,
          steps: draft.steps
        };
        State.addCustomQuest(state, draft.type, payload);
        var createdEvents = State.drainEvents(state);
        Storage.save(state);
        closeModalTo('quests');
        ctx.questTab = draft.type;
        refreshView();
        createdEvents.forEach(showToast);
        break;
      }

      default:
        break;
    }
  }

  // ---------------------------------------------------------
  // Event delegation — input / change (silent draft sync + a
  // few explicit re-renders where the UI structurally depends
  // on the new value, e.g. toggling the duration field).
  // ---------------------------------------------------------

  function syncAddQuestField(t) {
    if (!ctx.addQuestDraft) return false;
    if (t.hasAttribute('data-step-index')) {
      ctx.addQuestDraft.steps[Number(t.getAttribute('data-step-index'))] = t.value;
      return true;
    }
    if (t.name && Object.prototype.hasOwnProperty.call(ctx.addQuestDraft, t.name)) {
      ctx.addQuestDraft[t.name] = t.value;
      return true;
    }
    return false;
  }

  function onInput(e) {
    var t = e.target;
    if (t.id === 'hero-name') { ctx.onboardingForm.name = t.value; return; }
    if (ctx.modal === 'addquest') syncAddQuestField(t);
  }

  function onChange(e) {
    var t = e.target;

    if (t.id === 'import-file-input') {
      if (t.files && t.files[0]) {
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var imported = Storage.importJSON(reader.result);
            state = imported;
            State.rollOverIfNeeded(state);
            Storage.save(state);
            ctx = defaultCtx();
            renderAppShell();
            showToast({ type: 'info', emoji: '✅', text: 'Save imported successfully' });
          } catch (err) {
            window.alert('This file is not a valid LifeQuest save.');
          }
        };
        reader.readAsText(t.files[0]);
      }
      return;
    }

    if (t.id === 'reduce-motion-toggle') {
      state.settings.reduceMotion = t.checked;
      document.body.classList.toggle('lq-reduce-motion', t.checked);
      Storage.save(state);
      return;
    }

    if (ctx.modal === 'addquest') {
      var handled = syncAddQuestField(t);
      if (handled && t.tagName === 'SELECT') refreshModal();
    }
  }

  // ---------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------

  function onKeydown(e) {
    if (e.key === 'Escape' && ctx.modal) closeModal();
  }

  // ---------------------------------------------------------
  // Boot
  // ---------------------------------------------------------

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* non-fatal */ });
    }
  }

  function init() {
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', onKeydown);
    cacheStaticRoots();

    window.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && state) {
        State.rollOverIfNeeded(state);
        Storage.save(state);
        refreshHeader();
        if (!ctx.modal) refreshView();
      }
    });

    var loaded = Storage.load();
    if (loaded && loaded.character) {
      state = loaded;
      State.rollOverIfNeeded(state);
      Storage.save(state);
      if (state.settings && state.settings.reduceMotion) document.body.classList.add('lq-reduce-motion');
      renderAppShell();
    } else {
      renderOnboardingScreen();
    }

    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();