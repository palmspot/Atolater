// popup.js — あとで見る / Watch Later
const api = typeof browser !== 'undefined' ? browser : chrome;

// ── i18n helper ───────────────────────────────────────────────────
function getLang() {
  const saved = localStorage.getItem('atolater_lang');
  if (saved === 'ja' || saved === 'en') return saved;
  return navigator.language.startsWith('ja') ? 'ja' : 'en';
}

// DOM上のテキストをi18nで初期化
function applyI18n() {
  const L = MESSAGES[getLang()];
  document.getElementById('cur-title').textContent = L.loadingTab;
  document.querySelector('[data-tab="set"]').textContent    = L.tabSet;
  document.querySelector('[data-tab="list"]').textContent   = L.tabList;
  document.querySelector('[data-tab="settings"]').textContent = L.tabSettings;
  document.querySelector('label[for-id="fire-at"]')  // ラベルはfor-idでなくquerySelectorで対応
  // Quick times
  const qtBtns = document.querySelectorAll('.quick-times button');
  const qtKeys = ['min5','min15','min30','h1','h2','h8','tomorrow'];
  qtBtns.forEach((btn, i) => { if (qtKeys[i]) btn.textContent = L[qtKeys[i]]; });
  // Labels
  const labels = {
    'lbl-fire-at':      'labelFireAt',
    'lbl-memo':         'labelMemo',
    'lbl-email':        'labelEmail',
    'lbl-sgkey':        'labelSgKey',
    'lbl-from':         'labelFromEmail',
    'lbl-default-email':'labelDefaultEmail',
    'lbl-snooze':       'labelSnoozeOpts',
    'lbl-lang':         'labelLang',
    'lbl-default-min':  'labelDefaultMin',
  };
  Object.entries(labels).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el && L[key]) el.textContent = L[key];
  });
  // Placeholders
  document.getElementById('memo').placeholder = L.memoPlaceholder;
  // Buttons
  document.getElementById('btn-set').textContent          = L.btnSet;
  document.getElementById('btn-save-settings').textContent = L.btnSave;
  // Empty list
  const empty = document.querySelector('.empty-list');
  if (empty) empty.textContent = L.emptyList;
}

// ── Tab switching ─────────────────────────────────────────────────
document.querySelectorAll('.tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'list')     loadList();
    if (btn.dataset.tab === 'settings') loadSettings();
  });
});

document.getElementById('goSettings').addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="settings"]').classList.add('active');
  document.getElementById('tab-settings').classList.add('active');
  loadSettings();
});

// ── Current tab ───────────────────────────────────────────────────
let currentTab = null;

async function loadCurrentTab() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  document.getElementById('cur-title').textContent = tab.title || tab.url;
  document.getElementById('cur-url').textContent   = tab.url;

  const result = await api.storage.local.get('settings');
  const settings = result.settings || {};
  if (settings.defaultEmail) {
    document.getElementById('email-to').value = settings.defaultEmail;
  }
}

// ── Quick-time buttons ────────────────────────────────────────────
document.querySelectorAll('.quick-times button').forEach(btn => {
  btn.addEventListener('click', () => {
    const ms = parseInt(btn.dataset.min) * 60 * 1000;
    document.getElementById('fire-at').value = toLocalISOString(new Date(Date.now() + ms));
  });
});

function toLocalISOString(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function setDefaultFireAt() {
  const result = await api.storage.local.get('settings');
  const settings = result.settings || {};
  const minutes = settings.defaultMinutes || 10;
  document.getElementById('fire-at').value = toLocalISOString(new Date(Date.now() + minutes * 60 * 1000));
}

// ── Set schedule ──────────────────────────────────────────────────
document.getElementById('btn-set').addEventListener('click', async () => {
  const L = MESSAGES[getLang()];
  const fireAtVal = document.getElementById('fire-at').value;
  const emailTo   = document.getElementById('email-to').value.trim();
  const memo      = document.getElementById('memo').value.trim();

  if (!fireAtVal) return showStatus('set', L.errNoTime, 'err');
  const fireAt = new Date(fireAtVal).getTime();
  if (isNaN(fireAt) || fireAt <= Date.now()) return showStatus('set', L.errPastTime, 'err');
  if (!currentTab) return showStatus('set', L.errNoTab, 'err');

  const entry = {
    tabId:   currentTab.id,
    url:     currentTab.url,
    title:   currentTab.title || currentTab.url,
    fireAt,
    emailTo: emailTo || null,
    memo:    memo    || '',
  };

  const btn = document.getElementById('btn-set');
  btn.disabled = true;
  try {
    await api.runtime.sendMessage({ type: 'SET_SCHEDULE', entry });
    showStatus('set', L.successSet(new Date(fireAt).toLocaleString(getLang() === 'ja' ? 'ja-JP' : 'en-US')), 'ok');
  } catch (e) {
    showStatus('set', `Error: ${e.message}`, 'err');
  } finally {
    btn.disabled = false;
  }
});

// ── Schedule list ─────────────────────────────────────────────────
async function loadList() {
  const L = MESSAGES[getLang()];
  const { schedules } = await api.runtime.sendMessage({ type: 'GET_SCHEDULES' });
  const ul = document.getElementById('schedule-list');
  ul.innerHTML = '';

  const entries = Object.entries(schedules || {});
  if (entries.length === 0) {
    ul.innerHTML = `<li class="empty-list">${L.emptyList}</li>`;
    return;
  }

  entries.sort((a, b) => a[1].fireAt - b[1].fireAt);

  const result = await api.storage.local.get('settings');
  const snoozeOptions = (result.settings || {}).snoozeOptions || [5, 15, 60];
  const locale = getLang() === 'ja' ? 'ja-JP' : 'en-US';

  for (const [key, entry] of entries) {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="s-title">${escHtml(entry.title || entry.url)}</div>
      <div class="s-url">${escHtml(entry.url)}</div>
      ${entry.memo ? `<div class="s-memo">${escHtml(entry.memo)}</div>` : ''}
      <div class="s-time">⏰ ${new Date(entry.fireAt).toLocaleString(locale)}${entry.snoozed ? ' ' + L.snoozed : ''}</div>
      <div class="s-actions">
        ${snoozeOptions.map(m => `<button class="snooze-btn" data-key="${escHtml(key)}" data-min="${m}">${L.btnSnooze(m)}</button>`).join('')}
        <button class="remove-btn" data-key="${escHtml(key)}">${L.btnRemove}</button>
      </div>
    `;
    ul.appendChild(li);
  }

  ul.querySelectorAll('.snooze-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.runtime.sendMessage({ type: 'SNOOZE', key: btn.dataset.key, minutes: parseInt(btn.dataset.min) });
      loadList();
    });
  });
  ul.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.runtime.sendMessage({ type: 'REMOVE_SCHEDULE', key: btn.dataset.key });
      loadList();
    });
  });
}

// ── Settings ──────────────────────────────────────────────────────
async function loadSettings() {
  const result = await api.storage.local.get('settings');
  const settings = result.settings || {};
  document.getElementById('s-sgkey').value      = settings.sendgridApiKey || '';
  document.getElementById('s-from').value       = settings.fromEmail      || '';
  document.getElementById('s-email').value      = settings.defaultEmail   || '';
  document.getElementById('s-default-min').value = settings.defaultMinutes || 10;
  const opts = settings.snoozeOptions || [5, 15, 60];
  document.getElementById('s-snooze1').value = opts[0] ?? 5;
  document.getElementById('s-snooze2').value = opts[1] ?? 15;
  document.getElementById('s-snooze3').value = opts[2] ?? 60;
  // 言語
  const saved = localStorage.getItem('atolater_lang') || 'auto';
  document.getElementById('s-lang').value = saved;
}

document.getElementById('btn-save-settings').addEventListener('click', async () => {
  const L = MESSAGES[getLang()];

  // 言語設定はlocalStorageに保存
  const langVal = document.getElementById('s-lang').value;
  if (langVal === 'auto') {
    localStorage.removeItem('atolater_lang');
  } else {
    localStorage.setItem('atolater_lang', langVal);
  }

  const settings = {
    sendgridApiKey: document.getElementById('s-sgkey').value.trim(),
    fromEmail:      document.getElementById('s-from').value.trim(),
    defaultEmail:   document.getElementById('s-email').value.trim(),
    defaultMinutes: parseInt(document.getElementById('s-default-min').value) || 10,
    snoozeOptions: [
      parseInt(document.getElementById('s-snooze1').value) || 5,
      parseInt(document.getElementById('s-snooze2').value) || 15,
      parseInt(document.getElementById('s-snooze3').value) || 60,
    ],
  };
  await api.storage.local.set({ settings });
  showStatus('settings', L.successSave, 'ok');

  if (settings.defaultEmail) {
    document.getElementById('email-to').value = settings.defaultEmail;
  }

  // 言語切り替え後にUIを再描画
  applyI18n();
});

// ── Helpers ───────────────────────────────────────────────────────
function showStatus(panel, msg, type) {
  const el = document.getElementById(`status-${panel}`);
  el.textContent = msg;
  el.className = `status ${type}`;
  setTimeout(() => { el.className = 'status'; }, 4000);
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ──────────────────────────────────────────────────────────
applyI18n();
loadCurrentTab();
setDefaultFireAt();
