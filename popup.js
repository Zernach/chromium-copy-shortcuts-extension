const STORAGE_KEY = 'shortcuts';
const DRAFT_KEY = 'draft';
const LOCK_KEY = 'locked';
const PREVIEW_MAX = 48;

const els = {
  list: document.getElementById('shortcuts-list'),
  empty: document.getElementById('empty-state'),
  form: document.getElementById('add-form'),
  textarea: document.getElementById('shortcut-text'),
  newBtn: document.getElementById('new-btn'),
  cancelBtn: document.getElementById('cancel-btn'),
  toast: document.getElementById('toast'),
  lockBtn: document.getElementById('lock-btn'),
};

let toastTimer = null;

async function loadShortcuts() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
}

async function saveShortcuts(shortcuts) {
  await chrome.storage.local.set({ [STORAGE_KEY]: shortcuts });
}

async function loadDraft() {
  const result = await chrome.storage.local.get(DRAFT_KEY);
  return typeof result[DRAFT_KEY] === 'string' ? result[DRAFT_KEY] : '';
}

async function saveDraft(text) {
  await chrome.storage.local.set({ [DRAFT_KEY]: text });
}

async function clearDraft() {
  await chrome.storage.local.remove(DRAFT_KEY);
}

async function getLockState() {
  const r = await chrome.storage.local.get(LOCK_KEY);
  return !!r[LOCK_KEY];
}

async function setLockState(locked) {
  await chrome.storage.local.set({ [LOCK_KEY]: !!locked });
}

function updateLockUI(locked) {
  if (!els.lockBtn) return;
  els.lockBtn.setAttribute('aria-pressed', locked ? 'true' : 'false');
  const label = locked ? 'Unlock panel (dismiss on outside click)' : 'Lock panel open';
  els.lockBtn.setAttribute('aria-label', label);
  els.lockBtn.title = label;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

function isInjectableUrl(url) {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || /^file:\/\//i.test(url);
}

async function ensureOverlayInTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js'],
  });
}

async function toggleLock() {
  const next = !(await getLockState());
  await setLockState(next);
  updateLockUI(next);

  if (next) {
    const tab = await getActiveTab();
    if (!tab || !isInjectableUrl(tab.url)) {
      showToast("Can't show panel on this page");
      return;
    }
    try {
      await ensureOverlayInTab(tab.id);
    } catch (err) {
      showToast("Can't show panel on this page");
      return;
    }
    window.close();
  }
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('aria-label', 'Delete shortcut');
    deleteBtn.title = 'Delete shortcut';
    deleteBtn.textContent = '×';

    deleteBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      const current = await loadShortcuts();
      const next = current.filter((s) => s.id !== shortcut.id);
      await saveShortcuts(next);
      renderShortcuts(next);
    });

    item.appendChild(copyBtn);
    item.appendChild(deleteBtn);
    fragment.appendChild(item);
  });
  els.list.appendChild(fragment);
}

function showForm(initialText = '') {
  els.form.hidden = false;
  els.newBtn.hidden = true;
  els.textarea.value = initialText;
  setTimeout(() => {
    els.textarea.focus();
    const len = els.textarea.value.length;
    els.textarea.setSelectionRange(len, len);
  }, 0);
}

async function hideForm() {
  els.form.hidden = true;
  els.newBtn.hidden = false;
  els.textarea.value = '';
  await clearDraft();
}

async function handleSubmit(event) {
  event.preventDefault();
  const text = els.textarea.value;
  if (!text.trim()) return;

  const current = await loadShortcuts();
  const next = [...current, { id: makeId(), text, createdAt: Date.now() }];
  await saveShortcuts(next);
  renderShortcuts(next);
  await hideForm();
}

document.addEventListener('DOMContentLoaded', async () => {
  const [shortcuts, draft, locked] = await Promise.all([
    loadShortcuts(),
    loadDraft(),
    getLockState(),
  ]);
  renderShortcuts(shortcuts);
  updateLockUI(locked);

  if (draft) {
    showForm(draft);
  }

  els.newBtn.addEventListener('click', () => showForm());
  els.cancelBtn.addEventListener('click', hideForm);
  els.form.addEventListener('submit', handleSubmit);
  els.lockBtn.addEventListener('click', toggleLock);

  els.textarea.addEventListener('input', () => {
    saveDraft(els.textarea.value);
  });

  els.textarea.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit(event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      hideForm();
    }
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[STORAGE_KEY]) {
    renderShortcuts(changes[STORAGE_KEY].newValue || []);
  }
  if (changes[LOCK_KEY]) {
    updateLockUI(!!changes[LOCK_KEY].newValue);
  }
});
