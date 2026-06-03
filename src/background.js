// background.js — あとで見る service worker (Firefox MV3 / Chrome MV3 両対応)
// Firefox は browser.* / Chrome は chrome.* — 両方対応するため冒頭でエイリアス
const api = typeof browser !== 'undefined' ? browser : chrome;

// ── Storage helpers ──────────────────────────────────────────────
async function getSchedules() {
  const result = await api.storage.local.get('schedules');
  return result.schedules || {};
}
async function saveSchedules(schedules) {
  await api.storage.local.set({ schedules });
}
async function getSettings() {
  const result = await api.storage.local.get('settings');
  return result.settings || {};
}

// ── Set a schedule for a tab ─────────────────────────────────────
async function setSchedule(entry) {
  const schedules = await getSchedules();
  const key = `atolater_${entry.tabId}`;
  schedules[key] = {
    tabId:   entry.tabId,
    url:     entry.url,
    title:   entry.title,
    fireAt:  entry.fireAt,
    emailTo: entry.emailTo,
    memo:    entry.memo || '',
    snoozed: false,
  };
  await saveSchedules(schedules);
  await api.alarms.create(key, { when: entry.fireAt });
  console.log('[atolater] schedule set', key, new Date(entry.fireAt).toLocaleString());
}

// ── Remove a schedule ────────────────────────────────────────────
async function removeSchedule(key) {
  const schedules = await getSchedules();
  delete schedules[key];
  await saveSchedules(schedules);
  await api.alarms.clear(key);
}

// ── Snooze: reschedule N minutes later ───────────────────────────
async function snoozeSchedule(key, snoozeMinutes, updatedMemo) {
  const schedules = await getSchedules();
  const entry = schedules[key];
  if (!entry) return;
  const newFireAt = Date.now() + snoozeMinutes * 60 * 1000;
  entry.fireAt  = newFireAt;
  entry.snoozed = true;
  if (updatedMemo !== undefined) entry.memo = updatedMemo;
  await saveSchedules(schedules);
  await api.alarms.clear(key);
  await api.alarms.create(key, { when: newFireAt });
  console.log('[atolater] snoozed', key, snoozeMinutes, 'min');
}

async function snoozeScheduleAt(key, fireAt, updatedMemo) {
  const schedules = await getSchedules();
  const entry = schedules[key];
  if (!entry) return;
  entry.fireAt  = fireAt;
  entry.snoozed = true;
  if (updatedMemo !== undefined) entry.memo = updatedMemo;
  await saveSchedules(schedules);
  await api.alarms.clear(key);
  await api.alarms.create(key, { when: fireAt });
  console.log('[atolater] snoozed at', key, new Date(fireAt).toLocaleString());
}

// ── Send email via SendGrid API (user's own API key) ─────────────
async function sendEmail(to, subject, body) {
  const settings = await getSettings();
  const apiKey   = settings.sendgridApiKey || '';
  const fromAddr = settings.fromEmail      || '';

  if (!apiKey) {
    console.warn('[atolater] SendGrid API key not configured');
    return;
  }
  if (!fromAddr) {
    console.warn('[atolater] From email not configured');
    return;
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from:    { email: fromAddr },
        subject: subject,
        content: [{ type: 'text/plain', value: body }],
      }),
    });
    // SendGrid returns 202 on success
    if (res.status !== 202) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    console.log('[atolater] email sent via SendGrid to', to);
  } catch (e) {
    console.error('[atolater] SendGrid send failed', e);
  }
}

// ── Focus tab (bring to front) ───────────────────────────────────
async function focusTab(tabId, url) {
  try {
    const tab = await api.tabs.get(tabId);
    await api.windows.update(tab.windowId, { focused: true });
    await api.tabs.update(tabId, { active: true });
  } catch {
    if (url) {
      const newTab = await api.tabs.create({ url, active: true });
      return newTab.id;
    }
  }
  return tabId;
}

// ── Show browser notification with snooze actions ────────────────
function showNotification(key, title, snoozeOptions) {
  const buttons = snoozeOptions.map(m => ({ title: `スヌーズ ${m}分` }));
  buttons.push({ title: '閉じる' });
  api.notifications.create(key, {
    type:    'basic',
    iconUrl: '/icons/icon128.png',
    title:   '⏰ あとで見る',
    message: title,
    buttons,
    requireInteraction: true,
  });
}

// ── Alarm fired ──────────────────────────────────────────────────
api.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[atolater] alarm fired:', alarm.name);
  if (!alarm.name.startsWith('atolater_')) return;
  const key = alarm.name;
  const schedules = await getSchedules();
  const entry = schedules[key];
  if (!entry) return;

  const settings = await getSettings();
  const snoozeOptions = settings.snoozeOptions || [5, 15, 60];

  const newTabId = await focusTab(entry.tabId, entry.url);
  const targetTabId = newTabId || entry.tabId;

  // content script にオーバーレイ表示を指示
  try {
    await api.tabs.sendMessage(targetTabId, {
      type:   'SHOW_OVERLAY',
      title:  entry.title || entry.url,
      memo:   entry.memo  || '',
      fireAt: entry.fireAt,
    });
  } catch (e) {
    console.warn('[atolater] overlay message failed:', e.message);
  }

  if (entry.emailTo) {
    const subject = `[あとで見る] ${entry.title || entry.url}`;
    const body    = `タイマーが切れました。\n\nURL: ${entry.url}\nタイトル: ${entry.title}\n時刻: ${new Date().toLocaleString('ja-JP')}`;
    await sendEmail(entry.emailTo, subject, body);
  }

  showNotification(key, entry.title || entry.url, snoozeOptions);
});

// ── Notification button clicked ───────────────────────────────────
api.notifications.onButtonClicked.addListener(async (notifId, btnIndex) => {
  if (!notifId.startsWith('atolater_')) return;
  const settings = await getSettings();
  const snoozeOptions = settings.snoozeOptions || [5, 15, 60];
  api.notifications.clear(notifId);
  if (btnIndex < snoozeOptions.length) {
    await snoozeSchedule(notifId, snoozeOptions[btnIndex]);
  } else {
    await removeSchedule(notifId);
  }
});

// ── Tab closed ────────────────────────────────────────────────────
api.tabs.onRemoved.addListener(async (tabId) => {
  const key = `atolater_${tabId}`;
  const schedules = await getSchedules();
  const entry = schedules[key];
  if (!entry) return;
  console.log('[atolater] scheduled tab closed', key);
  if (entry.emailTo) {
    const subject = `[あとで見る] タブが閉じられました — ${entry.title || entry.url}`;
    const body    = `「あとで見る」設定中のタブが閉じられました。\n\nURL: ${entry.url}\nタイトル: ${entry.title}\n閉じた時刻: ${new Date().toLocaleString('ja-JP')}\n予定時刻: ${new Date(entry.fireAt).toLocaleString('ja-JP')}`;
    await sendEmail(entry.emailTo, subject, body);
  }
  await removeSchedule(key);
});

// ── Message handler from popup ────────────────────────────────────
api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type === 'SET_SCHEDULE') {
      await setSchedule(msg.entry);
      sendResponse({ ok: true });
    } else if (msg.type === 'REMOVE_SCHEDULE') {
      await removeSchedule(msg.key);
      sendResponse({ ok: true });
    } else if (msg.type === 'SNOOZE') {
      await snoozeSchedule(msg.key, msg.minutes, msg.memo);
      sendResponse({ ok: true });
    } else if (msg.type === 'SNOOZE_CURRENT') {
      const tabId = _sender.tab && _sender.tab.id;
      if (tabId) {
        const key = `atolater_${tabId}`;
        await snoozeSchedule(key, msg.minutes, msg.memo);
      }
      sendResponse({ ok: true });
    } else if (msg.type === 'SNOOZE_CURRENT_AT') {
      // 日時指定スヌーズ
      const tabId = _sender.tab && _sender.tab.id;
      if (tabId) {
        const key = `atolater_${tabId}`;
        await snoozeScheduleAt(key, msg.fireAt, msg.memo);
      }
      sendResponse({ ok: true });
    } else if (msg.type === 'GET_SCHEDULES') {
      const schedules = await getSchedules();
      sendResponse({ schedules });
    }
  })();
  return true;
});

console.log('[atolater] background script loaded');
