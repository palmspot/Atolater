// i18n.js — あとで見る / Watch Later  bilingual strings

const MESSAGES = {
  ja: {
    // Header
    appName:        'あとで見る',
    settingsBtn:    '設定',

    // Tabs
    tabSet:         'タイマー設定',
    tabList:        '一覧',
    tabSettings:    '設定',

    // Set panel
    loadingTab:     '読み込み中…',
    labelFireAt:    '通知時刻',
    labelMemo:      'やること（省略可）',
    memoPlaceholder:'◯◯を確認する、返信する　など',
    labelEmail:     'メール送信先（省略可）',
    btnSet:         'この時刻にセット',
    errNoTime:      '通知時刻を設定してください',
    errPastTime:    '未来の時刻を指定してください',
    errNoTab:       'タブ情報を取得できませんでした',
    successSet:     (t) => `✅ ${t} にセットしました`,

    // Quick times
    min5:  '5分後',
    min15: '15分後',
    min30: '30分後',
    h1:    '1時間後',
    h2:    '2時間後',
    h8:    '8時間後',
    tomorrow: '明日',

    // List panel
    emptyList:   'スケジュールなし',
    snoozed:     '(スヌーズ中)',
    btnSnooze:   (m) => `スヌーズ ${m}分`,
    btnRemove:   '削除',

    // Settings panel
    labelSgKey:     'SendGrid APIキー',
    sgKeyNote:      'Settings → API Keys で作成（Mail Send権限のみでOK）',
    labelFromEmail: '送信元メールアドレス',
    fromEmailNote:  'SendGridで認証済みのアドレスを使用してください',
    labelDefaultEmail: 'デフォルト送信先メール',
    labelSnoozeOpts:   'スヌーズ選択肢（分）',
    labelDefaultMin:   'デフォルト通知時間（分後）',
    btnSave:        '保存',
    successSave:    '✅ 保存しました',
    labelLang:      '言語 / Language',

    // Overlay (content.js)
    overlayBadge:   'あとで見る',
    overlaySetAt:   (t) => `⏰ ${t} に設定`,
    overlayTodo:    'やること',
    overlayHint:    '背景クリック または Esc で閉じる',
    overlaySnooze:  (m) => `スヌーズ ${m}分`,
  },

  en: {
    appName:        'Watch Later',
    settingsBtn:    'Settings',

    tabSet:         'Set Timer',
    tabList:        'List',
    tabSettings:    'Settings',

    loadingTab:     'Loading…',
    labelFireAt:    'Notify at',
    labelMemo:      'Reminder note (optional)',
    memoPlaceholder:'e.g. Reply to email, Review document…',
    labelEmail:     'Email notification (optional)',
    btnSet:         'Set timer',
    errNoTime:      'Please set a notification time',
    errPastTime:    'Please set a future time',
    errNoTab:       'Could not get tab info',
    successSet:     (t) => `✅ Timer set for ${t}`,

    min5:  '5 min',
    min15: '15 min',
    min30: '30 min',
    h1:    '1 hour',
    h2:    '2 hours',
    h8:    '8 hours',
    tomorrow: 'Tomorrow',

    emptyList:   'No scheduled tabs',
    snoozed:     '(snoozed)',
    btnSnooze:   (m) => `Snooze ${m}m`,
    btnRemove:   'Remove',

    labelSgKey:        'SendGrid API Key',
    sgKeyNote:         'Create at Settings → API Keys (Mail Send permission only)',
    labelFromEmail:    'From email address',
    fromEmailNote:     'Must be a verified sender in SendGrid',
    labelDefaultEmail: 'Default recipient email',
    labelSnoozeOpts:   'Snooze options (minutes)',
    labelDefaultMin:   'Default timer (minutes from now)',
    btnSave:           'Save',
    successSave:       '✅ Saved',
    labelLang:         '言語 / Language',

    overlayBadge:  'Watch Later',
    overlaySetAt:  (t) => `⏰ Set for ${t}`,
    overlayTodo:   'Reminder',
    overlayHint:   'Click backdrop or press Esc to dismiss',
    overlaySnooze: (m) => `Snooze ${m}m`,
  },
};

function detectLang() {
  const saved = localStorage.getItem('atolater_lang');
  if (saved === 'ja' || saved === 'en') return saved;
  return navigator.language.startsWith('ja') ? 'ja' : 'en';
}

function t(key, ...args) {
  const lang = detectLang();
  const val  = MESSAGES[lang][key] ?? MESSAGES['en'][key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}
