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
const POSITION_KEY = 'panelPosition';
const VALID_POSITIONS = ['upper-left', 'upper-right', 'lower-left', 'lower-right'];
const DEFAULT_POSITION = 'upper-right';
const EDGE_OFFSET = '16px';
const EDGE_OFFSET_PX = 16;
const MIN_PANEL_HEIGHT = 80;

let messageHandler = null;
let resizeHandler = null;
let lastReportedHeight = 0;

function maxPanelHeight() {
  return Math.max(MIN_PANEL_HEIGHT, window.innerHeight - EDGE_OFFSET_PX * 2);
}

function clampPanelHeight(h) {
  return Math.min(Math.max(h, MIN_PANEL_HEIGHT), maxPanelHeight());
}

function detachPanelListeners() {
  if (messageHandler) {
    window.removeEventListener('message', messageHandler);
    messageHandler = null;
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  lastReportedHeight = 0;
}

function normalizePosition(value) {
  return VALID_POSITIONS.indexOf(value) !== -1 ? value : DEFAULT_POSITION;
}

function applyPanelPosition(iframe, position) {
  const pos = normalizePosition(position);
  const isUpper = pos === 'upper-left' || pos === 'upper-right';
  const isLeft = pos === 'upper-left' || pos === 'lower-left';
  iframe.style.setProperty('position', 'fixed', 'important');
  iframe.style.setProperty('top', isUpper ? EDGE_OFFSET : 'auto', 'important');
  iframe.style.setProperty('bottom', isUpper ? 'auto' : EDGE_OFFSET, 'important');
  iframe.style.setProperty('left', isLeft ? EDGE_OFFSET : 'auto', 'important');
  iframe.style.setProperty('right', isLeft ? 'auto' : EDGE_OFFSET, 'important');
}

async function showPanel() {
  if (document.getElementById(PANEL_ID)) return;
  const stored = await chrome.storage.local.get(POSITION_KEY);
  const iframe = document.createElement('iframe');
  iframe.id = PANEL_ID;
  iframe.src = chrome.runtime.getURL('popup.html?embedded=1');
  iframe.title = 'Copy Shortcuts';
  iframe.setAttribute('allow', 'clipboard-write');
  Object.assign(iframe.style, {
    position: 'fixed',
    width: '320px',
    height: `${MIN_PANEL_HEIGHT}px`,
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
    background: 'transparent',
    zIndex: '2147483647',
    colorScheme: 'dark',
  });
  applyPanelPosition(iframe, stored[POSITION_KEY]);
  (document.body || document.documentElement).appendChild(iframe);

  detachPanelListeners();
  messageHandler = (event) => {
    if (event.source !== iframe.contentWindow) return;
    const data = event.data;
    if (!data || data.type !== 'copy-shortcuts-resize') return;
    if (typeof data.height !== 'number' || !isFinite(data.height)) return;
    lastReportedHeight = data.height;
    iframe.style.height = `${clampPanelHeight(data.height)}px`;
  };
  resizeHandler = () => {
    if (lastReportedHeight > 0) {
      iframe.style.height = `${clampPanelHeight(lastReportedHeight)}px`;
    }
  };
  window.addEventListener('message', messageHandler);
  window.addEventListener('resize', resizeHandler);
}

function hidePanel() {
  const el = document.getElementById(PANEL_ID);
  if (el) el.remove();
  detachPanelListeners();
}

window.__copyShortcutsShow = showPanel;
window.__copyShortcutsHide = hidePanel;

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[LOCK_KEY]) {
    if (changes[LOCK_KEY].newValue) showPanel();
    else hidePanel();
  }
  if (changes[POSITION_KEY]) {
    const el = document.getElementById(PANEL_ID);
    if (el) applyPanelPosition(el, changes[POSITION_KEY].newValue);
  }
});

(async () => {
  const r = await chrome.storage.local.get(LOCK_KEY);
  if (r[LOCK_KEY]) showPanel();
})();

}

