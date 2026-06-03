// content.js — Watch Later / あとで見る overlay

(function () {
  if (window.__atolaterInjected) return;
  window.__atolaterInjected = true;

  const api = typeof browser !== 'undefined' ? browser : chrome;

  // ── i18n (minimal inline) ────────────────────────────────────
  const OL = {
    ja: {
      badge:   'あとで見る',
      setAt:   (t) => `⏰ ${t} に設定`,
      todo:    'やること',
      hint:    '背景クリック または Esc で閉じる',
      customDtHint: '日時を指定して Enter',
      customBtn: '日時指定して再通知',
      snooze:  (m) => `スヌーズ ${m}分`,
    },
    en: {
      badge:   'Watch Later',
      setAt:   (t) => `⏰ Set for ${t}`,
      todo:    'Reminder',
      hint:    'Click backdrop or press Esc to dismiss',
      customDtHint: 'Set date/time and press Enter',
      customBtn: 'Notify at this time',
      snooze:  (m) => `Snooze ${m}m`,
    },
  };

  function olLang() {
    try {
      const saved = localStorage.getItem('atolater_lang');
      if (saved === 'ja' || saved === 'en') return saved;
    } catch {}
    return navigator.language.startsWith('ja') ? 'ja' : 'en';
  }
  function ol(key, ...args) {
    const L = OL[olLang()] || OL.en;
    const v = L[key];
    return typeof v === 'function' ? v(...args) : v;
  }

  // ── Title blink ───────────────────────────────────────────────
  let _blinkTimer = null, _origTitle = null;

  function startTitleBlink(label) {
    stopTitleBlink();
    _origTitle = document.title;
    let on = true;
    _blinkTimer = setInterval(() => {
      document.title = on ? `⏰ ${label}` : _origTitle;
      on = !on;
    }, 900);
  }
  function stopTitleBlink() {
    if (_blinkTimer) { clearInterval(_blinkTimer); _blinkTimer = null; }
    if (_origTitle !== null) { document.title = _origTitle; _origTitle = null; }
  }

  // ── Message listener ─────────────────────────────────────────
  api.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SHOW_OVERLAY') {
      showOverlay(msg.title, msg.memo, msg.fireAt);
      startTitleBlink(msg.memo || ol('badge'));
    }
  });

  // ── Overlay ───────────────────────────────────────────────────
  function showOverlay(pageTitle, memo, fireAt) {
    const existing = document.getElementById('__atolater_overlay');
    if (existing) existing.remove();

    const lang = olLang();
    const timeStr = fireAt
      ? new Date(fireAt).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';

    const host = document.createElement('div');
    host.id = '__atolater_overlay';
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          pointer-events: all; animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .card {
          background: rgba(22,20,42,0.92);
          backdrop-filter: blur(24px) saturate(1.6);
          -webkit-backdrop-filter: blur(24px) saturate(1.6);
          border: 1px solid rgba(255,255,255,0.13); border-radius: 20px;
          padding: 28px 32px 24px; max-width: 400px; width: calc(100vw - 40px);
          color: #f0eeff;
          font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', sans-serif;
          box-shadow: 0 28px 72px rgba(0,0,0,0.6), 0 0 0 1px rgba(140,130,255,0.12);
          animation: slideUp 0.28s cubic-bezier(0.16,1,0.3,1), ringPulse 1.2s ease-in-out 0.3s 4;
          pointer-events: all; position: relative;
        }
        @keyframes slideUp {
          from{opacity:0;transform:translateY(20px) scale(0.97)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes ringPulse {
          0%,100%{box-shadow:0 28px 72px rgba(0,0,0,0.6),0 0 0 1px rgba(140,130,255,0.12)}
          50%{box-shadow:0 28px 72px rgba(0,0,0,0.6),0 0 0 4px rgba(160,140,255,0.7)}
        }
        .badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(160,150,255,0.15); border: 1px solid rgba(160,150,255,0.28);
          border-radius: 20px; padding: 3px 11px; font-size: 11px; color: #c4beff;
          margin-bottom: 14px; letter-spacing: 0.03em;
        }
        .dot {
          width:6px;height:6px;border-radius:50%;background:#a09aff;
          animation:dotPulse 1.6s infinite;
        }
        @keyframes dotPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.65)}}
        .time-badge { font-size:11px;color:rgba(200,196,255,0.55);margin-bottom:10px; }
        .page-title {
          font-size:13px;font-weight:600;color:#ccc8f0;line-height:1.45;
          margin-bottom:14px;padding-bottom:12px;
          border-bottom:1px solid rgba(255,255,255,0.07);word-break:break-all;
        }
        .memo-label { font-size:10px;color:rgba(200,196,255,0.45);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:5px; }
        .memo-edit {
          flex:1;background:rgba(255,255,255,0.07);
          border:1px solid rgba(255,255,255,0.15);border-radius:10px;
          padding:10px 12px;font-size:17px;font-weight:600;color:#fff;
          font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;
          line-height:1.55;resize:vertical;outline:none;
          transition:border-color 0.15s;box-sizing:border-box;
        }
        .memo-edit:focus{border-color:rgba(160,150,255,0.6);background:rgba(255,255,255,0.1);}
        .snooze-row{display:flex;gap:7px;margin-top:18px;flex-wrap:wrap;}
        .snooze-btn {
          flex:1;min-width:68px;background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.11);border-radius:8px;
          padding:6px 4px;font-size:11px;color:rgba(200,196,255,0.75);
          cursor:pointer;transition:background 0.13s;
        }
        .snooze-btn:hover{background:rgba(160,150,255,0.22);border-color:rgba(160,150,255,0.45);color:#fff;}
        .hint{margin-top:18px;font-size:11px;color:rgba(200,196,255,0.35);text-align:center;}
        .custom-row{display:flex;gap:7px;margin-top:8px;align-items:center;}
        .custom-dt{
          flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.13);
          border-radius:8px;padding:6px 8px;font-size:11px;color:#e0dcff;
          outline:none;color-scheme:dark;transition:border-color 0.13s;box-sizing:border-box;
        }
        .custom-dt:focus{border-color:rgba(160,150,255,0.5);}
        .custom-btn{
          background:rgba(160,150,255,0.2);border:1px solid rgba(160,150,255,0.35);
          border-radius:8px;padding:6px 10px;font-size:11px;color:#c4beff;
          cursor:pointer;white-space:nowrap;transition:background 0.13s;flex-shrink:0;
        }
        .custom-btn:hover{background:rgba(160,150,255,0.35);color:#fff;}
        .custom-dt.err{border-color:rgba(255,100,100,0.6);}
        .custom-btn{
          background:rgba(160,150,255,0.15);border:1px solid rgba(160,150,255,0.3);
          border-radius:8px;padding:6px 10px;font-size:11px;color:#c4beff;
          cursor:pointer;white-space:nowrap;transition:background 0.13s;
        }
        .custom-btn:hover{background:rgba(160,150,255,0.3);color:#fff;}
        .close-btn {
          position:absolute;top:13px;right:14px;background:rgba(255,255,255,0.07);
          border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;
          color:rgba(255,255,255,0.45);font-size:13px;
          display:flex;align-items:center;justify-content:center;
          transition:background 0.13s,color 0.13s;
        }
        .close-btn:hover{background:rgba(255,255,255,0.15);color:#fff;}
      </style>

      <div class="backdrop" id="backdrop">
        <div class="card" id="card">
          <button class="close-btn" id="closeBtn">✕</button>
          <div class="badge"><span class="dot"></span>${ol('badge')}</div>
          ${timeStr ? `<div class="time-badge">${ol('setAt', timeStr)}</div>` : ''}
          <div class="page-title">${escHtml(pageTitle)}</div>
          <div class="memo-label">${ol('todo')}</div>
          <textarea class="memo-edit" id="memoEdit" rows="3" placeholder="">${escHtml(memo)}</textarea>
          <div class="snooze-row" id="snoozeRow"></div>
          <div class="custom-row">
            <input type="datetime-local" id="customDt" class="custom-dt">
            <button class="custom-btn" id="customBtn">${ol('customBtn')}</button>
          </div>
          <div class="hint">${ol('hint')}</div>
        </div>
      </div>
    `;

    // Snooze buttons
    api.storage.local.get('settings').then(result => {
      const opts = (result.settings || {}).snoozeOptions || [5, 15, 60];
      const row = shadow.getElementById('snoozeRow');
      opts.forEach(m => {
        const btn = document.createElement('button');
        btn.className = 'snooze-btn';
        btn.textContent = ol('snooze', m);
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const editedMemo = shadow.getElementById('memoEdit').value.trim();
          api.runtime.sendMessage({ type: 'SNOOZE_CURRENT', minutes: m, memo: editedMemo });
          closeOverlay(true);
        });
        row.appendChild(btn);
      });
    });

    // 日時指定スヌーズ — デフォルトは発火時刻そのまま
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    shadow.getElementById('customDt').value =
      `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    function fireCustomSnooze() {
      const dtInput = shadow.getElementById('customDt');
      const fireAt  = new Date(dtInput.value).getTime();
      if (!dtInput.value || isNaN(fireAt) || fireAt <= Date.now()) {
        dtInput.classList.add('err');
        setTimeout(() => dtInput.classList.remove('err'), 1500);
        return;
      }
      const editedMemo = shadow.getElementById('memoEdit').value.trim();
      api.runtime.sendMessage({ type: 'SNOOZE_CURRENT_AT', fireAt, memo: editedMemo });
      closeOverlay(true);
    }

    shadow.getElementById('customBtn').addEventListener('click', e => {
      e.stopPropagation();
      fireCustomSnooze();
    });
    shadow.getElementById('customDt').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.stopPropagation(); fireCustomSnooze(); }
    });

    // Close
    function closeOverlay(keepBlink) {
      if (!keepBlink) stopTitleBlink();
      host.style.transition = 'opacity 0.18s';
      host.style.opacity = '0';
      setTimeout(() => host.remove(), 190);
      document.removeEventListener('keydown', onKey);
    }

    shadow.getElementById('backdrop').addEventListener('click', e => {
      if (e.target === shadow.getElementById('backdrop')) closeOverlay();
    });
    shadow.getElementById('card').addEventListener('click', e => e.stopPropagation());
    shadow.getElementById('closeBtn').addEventListener('click', () => closeOverlay());

    function onKey(e) { if (e.key === 'Escape') closeOverlay(); }
    document.addEventListener('keydown', onKey);

    document.addEventListener('visibilitychange', function onVisible() {
      if (!document.hidden) {
        stopTitleBlink();
        document.removeEventListener('visibilitychange', onVisible);
      }
    });
  }

  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
