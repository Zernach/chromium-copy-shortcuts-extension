if (window.__copyShortcutsContentLoaded) {
  // Already injected in this frame; just sync visibility with current state.
  (async () => {
    const r = await chrome.storage.local.get('locked');
    if (r.locked && !document.getElementById('__copy-shortcuts-overlay__')) {
      window.__copyShortcutsShow && window.__copyShortcutsShow();
    }
  })();
} else {
  window.__copyShortcutsContentLoaded = true;
  initCopyShortcutsOverlay();
}

function initCopyShortcutsOverlay() {

const PANEL_ID = '__copy-shortcuts-overlay__';
const LOCK_KEY = 'locked';

function showPanel() {
  if (document.getElementById(PANEL_ID)) return;
  const iframe = document.createElement('iframe');
  iframe.id = PANEL_ID;
  iframe.src = chrome.runtime.getURL('popup.html?embedded=1');
  iframe.title = 'Copy Shortcuts';
  iframe.setAttribute('allow', 'clipboard-write');
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    width: '320px',
    height: '480px',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
    background: 'transparent',
    zIndex: '2147483647',
    colorScheme: 'dark',
  });
  (document.body || document.documentElement).appendChild(iframe);
}

function hidePanel() {
  const el = document.getElementById(PANEL_ID);
  if (el) el.remove();
}

window.__copyShortcutsShow = showPanel;
window.__copyShortcutsHide = hidePanel;

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[LOCK_KEY]) return;
  if (changes[LOCK_KEY].newValue) showPanel();
  else hidePanel();
});

(async () => {
  const r = await chrome.storage.local.get(LOCK_KEY);
  if (r[LOCK_KEY]) showPanel();
})();

}

