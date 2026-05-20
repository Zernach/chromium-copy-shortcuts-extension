const STORAGE_KEY = 'shortcuts';
const DRAFT_KEY = 'draft';
const LOCK_KEY = 'locked';
const FORM_STATE_KEY = 'formState';
const POSITION_KEY = 'panelPosition';
const POSITION_MENU_OPEN_KEY = 'positionMenuOpen';
const PREVIEW_MAX = 48;
const VALID_POSITIONS = ['upper-left', 'upper-right', 'lower-left', 'lower-right'];
const DEFAULT_POSITION = 'upper-right';

const els = {
  list: document.getElementById('shortcuts-list'),
  empty: document.getElementById('empty-state'),
  footer: document.getElementById('app-footer'),
  form: document.getElementById('add-form'),
  formLabel: document.getElementById('form-label'),
  textarea: document.getElementById('shortcut-text'),
  cancelBtn: document.getElementById('cancel-btn'),
  saveBtn: document.getElementById('save-btn'),
  toast: document.getElementById('toast'),
  lockBtn: document.getElementById('lock-btn'),
  addBtn: document.getElementById('add-btn'),
  positionWrap: document.getElementById('position-wrap'),
  positionBtn: document.getElementById('position-btn'),
  positionMenu: document.getElementById('position-menu'),
  positionOptions: document.querySelectorAll('.position-option'),
};

let toastTimer = null;
let editingId = null;
let extensionOrphaned = false;

function isExtensionContextValid() {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (_) {
    return false;
  }
}

function isContextInvalidatedError(err) {
  const msg = err && (err.message || String(err));
  return typeof msg === 'string' && msg.indexOf('Extension context invalidated') !== -1;
}

function handleOrphaned() {
  if (extensionOrphaned) return;
  extensionOrphaned = true;
  try {
    window.parent.postMessage({ type: 'copy-shortcuts-orphan' }, '*');
  } catch (_) { /* no parent or cross-origin restriction */ }
}

async function safeStorageGet(keys) {
  if (!isExtensionContextValid()) {
    handleOrphaned();
    return {};
  }
  try {
    return await chrome.storage.local.get(keys);
  } catch (err) {
    if (isContextInvalidatedError(err)) handleOrphaned();
    return {};
  }
}

async function safeStorageSet(items) {
  if (!isExtensionContextValid()) {
    handleOrphaned();
    return;
  }
  try {
    await chrome.storage.local.set(items);
  } catch (err) {
    if (isContextInvalidatedError(err)) handleOrphaned();
  }
}

async function safeStorageRemove(keys) {
  if (!isExtensionContextValid()) {
    handleOrphaned();
    return;
  }
  try {
    await chrome.storage.local.remove(keys);
  } catch (err) {
    if (isContextInvalidatedError(err)) handleOrphaned();
  }
}

function isEmbedded() {
  try {
    return new URLSearchParams(window.location.search).get('embedded') === '1';
  } catch (_) {
    return false;
  }
}

function setupHeightReporting() {
  let pending = false;
  const measureMainContent = (main) => {
    if (!main) return 0;
    const style = getComputedStyle(main);
    const padTop = parseFloat(style.paddingTop) || 0;
    const padBottom = parseFloat(style.paddingBottom) || 0;
    const gap = parseFloat(style.rowGap) || parseFloat(style.gap) || 0;
    let contentH = 0;
    let visible = 0;
    for (const child of main.children) {
      if (child.hidden || child.offsetParent === null) continue;
      contentH += child.getBoundingClientRect().height;
      visible += 1;
    }
    if (visible > 1) contentH += gap * (visible - 1);
    return contentH + padTop + padBottom;
  };
  const send = () => {
    pending = false;
    const header = document.querySelector('.app-header');
    const main = document.querySelector('.app-main');
    const footer = els.footer;
    const headerH = header ? header.offsetHeight : 0;
    const mainH = measureMainContent(main);
    const footerH = footer && !footer.hidden ? footer.offsetHeight : 0;
    const total = Math.ceil(headerH + mainH + footerH);
    try {
      window.parent.postMessage({ type: 'copy-shortcuts-resize', height: total }, '*');
    } catch (_) { /* no parent or cross-origin restriction */ }
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(send);
  };

  const mo = new MutationObserver(schedule);
  mo.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'class', 'style'],
  });

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    if (els.textarea) ro.observe(els.textarea);
  }

  window.addEventListener('load', schedule);
  schedule();
}

async function loadShortcuts() {
  const result = await safeStorageGet(STORAGE_KEY);
  return Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
}

async function saveShortcuts(shortcuts) {
  await safeStorageSet({ [STORAGE_KEY]: shortcuts });
}

async function loadDraft() {
  const result = await safeStorageGet(DRAFT_KEY);
  return typeof result[DRAFT_KEY] === 'string' ? result[DRAFT_KEY] : '';
}

async function saveDraft(text) {
  await safeStorageSet({ [DRAFT_KEY]: text });
}

async function clearDraft() {
  await safeStorageRemove(DRAFT_KEY);
}

async function getLockState() {
  const r = await safeStorageGet(LOCK_KEY);
  return !!r[LOCK_KEY];
}

async function setLockState(locked) {
  await safeStorageSet({ [LOCK_KEY]: !!locked });
}

function normalizePosition(value) {
  return VALID_POSITIONS.includes(value) ? value : DEFAULT_POSITION;
}

async function getPosition() {
  const r = await safeStorageGet(POSITION_KEY);
  return normalizePosition(r[POSITION_KEY]);
}

async function setPosition(position) {
  await safeStorageSet({ [POSITION_KEY]: normalizePosition(position) });
}

async function getPositionMenuOpen() {
  const r = await safeStorageGet(POSITION_MENU_OPEN_KEY);
  return !!r[POSITION_MENU_OPEN_KEY];
}

async function setPositionMenuOpen(open) {
  await safeStorageSet({ [POSITION_MENU_OPEN_KEY]: !!open });
}

function normalizeFormState(value) {
  if (!value || typeof value !== 'object') return { open: false, editingId: null };
  return {
    open: !!value.open,
    editingId: typeof value.editingId === 'string' ? value.editingId : null,
  };
}

async function loadFormState() {
  const r = await safeStorageGet(FORM_STATE_KEY);
  return normalizeFormState(r[FORM_STATE_KEY]);
}

async function saveFormState(state) {
  await safeStorageSet({ [FORM_STATE_KEY]: normalizeFormState(state) });
}

function updateLockUI(locked) {
  if (!els.lockBtn) return;
  els.lockBtn.setAttribute('aria-pressed', locked ? 'true' : 'false');
  const label = locked ? 'Unlock panel (dismiss on outside click)' : 'Lock panel open';
  els.lockBtn.setAttribute('aria-label', label);
  els.lockBtn.title = label;
  if (els.positionWrap) {
    els.positionWrap.hidden = !locked;
  }
  if (!locked) setPositionMenuOpen(false);
}

function updatePositionUI(position) {
  const normalized = normalizePosition(position);
  els.positionOptions.forEach((opt) => {
    const selected = opt.dataset.position === normalized;
    opt.setAttribute('aria-checked', selected ? 'true' : 'false');
  });
}

function applyPositionMenuOpen(open) {
  if (!els.positionMenu) return;
  els.positionMenu.hidden = !open;
  els.positionBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function isInjectableUrl(url) {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || /^file:\/\//i.test(url);
}

async function ensureOverlayInAllTabs() {
  if (!isExtensionContextValid()) {
    handleOrphaned();
    return { injected: 0, supported: false };
  }
  if (!chrome.scripting || !chrome.scripting.executeScript || !chrome.tabs) {
    return { injected: 0, supported: false };
  }
  try {
    const tabs = await chrome.tabs.query({});
    const targets = tabs.filter((t) => t.id != null && isInjectableUrl(t.url));
    await Promise.allSettled(
      targets.map((t) =>
        chrome.scripting.executeScript({
          target: { tabId: t.id, allFrames: false },
          files: ['content.js'],
        })
      )
    );
    return { injected: targets.length, supported: true };
  } catch (err) {
    if (isContextInvalidatedError(err)) handleOrphaned();
    return { injected: 0, supported: false };
  }
}

async function toggleLock() {
  const next = !(await getLockState());
  await setLockState(next);
  updateLockUI(next);

  if (next) {
    const { injected, supported } = await ensureOverlayInAllTabs();
    if (!supported) {
      showToast('Reload the extension to enable lock');
      return;
    }
    if (injected === 0) {
      showToast('No eligible tabs to lock onto');
      return;
    }
    window.close();
  }
}

function buildPreview(text) {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > PREVIEW_MAX ? `${oneLine.slice(0, PREVIEW_MAX)}…` : oneLine;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => { els.toast.hidden = true; }, 200);
  }, 1400);
}

function renderShortcuts(shortcuts) {
  els.list.innerHTML = '';

  if (shortcuts.length === 0) {
    els.empty.hidden = false;
    return;
  }
  els.empty.hidden = true;

  const fragment = document.createDocumentFragment();
  shortcuts.forEach((shortcut) => {
    const item = document.createElement('li');
    item.className = 'shortcut-item';
    if (shortcut.id === editingId) {
      item.classList.add('is-editing');
    }

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'shortcut-btn';
    copyBtn.title = shortcut.text;

    const preview = document.createElement('span');
    preview.className = 'shortcut-preview';
    preview.textContent = buildPreview(shortcut.text);
    copyBtn.appendChild(preview);

    copyBtn.addEventListener('click', async () => {
      const ok = await copyToClipboard(shortcut.text);
      showToast(ok ? 'Copied to clipboard' : 'Copy failed');
    });

    const actions = document.createElement('div');
    actions.className = 'shortcut-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.setAttribute('aria-label', 'Delete shortcut');
    deleteBtn.title = 'Delete shortcut';
    deleteBtn.textContent = '×';

    deleteBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      const current = await loadShortcuts();
      const next = current.filter((s) => s.id !== shortcut.id);
      await saveShortcuts(next);
      if (editingId === shortcut.id) {
        await closeForm();
      }
    });

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'action-btn edit-btn';
    editBtn.setAttribute('aria-label', 'Edit shortcut');
    editBtn.title = 'Edit shortcut';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';

    editBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      startEditing(shortcut);
    });

    actions.appendChild(deleteBtn);
    actions.appendChild(editBtn);

    item.appendChild(copyBtn);
    item.appendChild(actions);
    fragment.appendChild(item);
  });
  els.list.appendChild(fragment);
}

function applyFormState(state) {
  const next = normalizeFormState(state);
  const prevEditingId = editingId;
  editingId = next.editingId;

  if (next.open) {
    const isEdit = !!next.editingId;
    els.formLabel.textContent = isEdit ? 'Edit shortcut' : 'New shortcut';
    els.saveBtn.textContent = isEdit ? 'Update' : 'Save';
    els.form.hidden = false;
    els.footer.hidden = false;
  } else {
    els.form.hidden = true;
    els.footer.hidden = true;
    if (document.activeElement !== els.textarea) {
      els.textarea.value = '';
    }
    els.formLabel.textContent = 'New shortcut';
    els.saveBtn.textContent = 'Save';
  }

  if (prevEditingId !== editingId) {
    loadShortcuts().then(renderShortcuts);
  }
}

function applyDraftToTextarea(text) {
  if (document.activeElement === els.textarea) return;
  if (els.textarea.value !== text) {
    els.textarea.value = text;
  }
}

function focusTextareaAtEnd() {
  setTimeout(() => {
    els.textarea.focus();
    const len = els.textarea.value.length;
    els.textarea.setSelectionRange(len, len);
  }, 0);
}

function startEditing(shortcut) {
  (async () => {
    await Promise.all([
      saveFormState({ open: true, editingId: shortcut.id }),
      saveDraft(shortcut.text),
    ]);
    focusTextareaAtEnd();
  })();
}

function startCreating() {
  (async () => {
    await Promise.all([
      saveFormState({ open: true, editingId: null }),
      clearDraft(),
    ]);
    els.textarea.value = '';
    focusTextareaAtEnd();
  })();
}

function generateShortcutId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function closeForm() {
  await Promise.all([
    saveFormState({ open: false, editingId: null }),
    clearDraft(),
  ]);
}

async function handleSubmit(event) {
  event.preventDefault();
  const text = els.textarea.value;
  if (!text.trim()) return;

  const current = await loadShortcuts();
  const now = Date.now();
  let next;
  if (editingId === null) {
    next = [...current, { id: generateShortcutId(), text, createdAt: now, updatedAt: now }];
  } else {
    next = current.map((s) =>
      s.id === editingId ? { ...s, text, updatedAt: now } : s
    );
  }
  await saveShortcuts(next);
  await closeForm();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (isEmbedded()) {
    document.documentElement.classList.add('embedded');
    setupHeightReporting();
  }

  const [shortcuts, draft, locked, formState, position, positionMenuOpen] = await Promise.all([
    loadShortcuts(),
    loadDraft(),
    getLockState(),
    loadFormState(),
    getPosition(),
    getPositionMenuOpen(),
  ]);
  editingId = formState.editingId;
  renderShortcuts(shortcuts);
  updatePositionUI(position);
  updateLockUI(locked);
  applyPositionMenuOpen(locked && positionMenuOpen);
  applyFormState(formState);
  if (formState.open) {
    els.textarea.value = draft;
  }

  els.cancelBtn.addEventListener('click', closeForm);
  els.form.addEventListener('submit', handleSubmit);
  els.lockBtn.addEventListener('click', toggleLock);
  els.addBtn.addEventListener('click', startCreating);

  els.positionBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    setPositionMenuOpen(els.positionMenu.hidden);
  });

  els.positionOptions.forEach((opt) => {
    opt.addEventListener('click', async (event) => {
      event.stopPropagation();
      const next = opt.dataset.position;
      updatePositionUI(next);
      if (isEmbedded()) {
        try {
          window.parent.postMessage({ type: 'copy-shortcuts-position', position: next }, '*');
        } catch (_) { /* no parent or cross-origin restriction */ }
      }
      await setPosition(next);
      setPositionMenuOpen(false);
    });
  });

  document.addEventListener('click', (event) => {
    if (!els.positionMenu || els.positionMenu.hidden) return;
    if (!els.positionWrap.contains(event.target)) setPositionMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && els.positionMenu && !els.positionMenu.hidden) {
      setPositionMenuOpen(false);
    }
  });

  els.textarea.addEventListener('input', () => {
    saveDraft(els.textarea.value);
  });

  els.textarea.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit(event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeForm();
    }
  });
});

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[STORAGE_KEY]) {
      renderShortcuts(changes[STORAGE_KEY].newValue || []);
    }
    if (changes[LOCK_KEY]) {
      updateLockUI(!!changes[LOCK_KEY].newValue);
    }
    if (changes[FORM_STATE_KEY]) {
      applyFormState(changes[FORM_STATE_KEY].newValue);
    }
    if (changes[DRAFT_KEY]) {
      applyDraftToTextarea(changes[DRAFT_KEY].newValue || '');
    }
    if (changes[POSITION_KEY]) {
      updatePositionUI(changes[POSITION_KEY].newValue);
    }
    if (changes[POSITION_MENU_OPEN_KEY]) {
      applyPositionMenuOpen(!!changes[POSITION_MENU_OPEN_KEY].newValue);
    }
  });
} catch (err) {
  if (isContextInvalidatedError(err)) handleOrphaned();
}
