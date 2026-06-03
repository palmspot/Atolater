# あとで見る / Watch Later

A browser extension for Firefox and Chrome that lets you set a timer on any tab.  
When the timer fires, the tab comes to the front with an overlay showing your reminder note.

タブにタイマーをセットして、時間になったら最前面表示＋オーバーレイ通知する拡張機能です。

![Firefox](https://img.shields.io/badge/Firefox-109%2B-orange)
![Chrome](https://img.shields.io/badge/Chrome-MV3-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features / 機能

| | EN | JA |
|---|---|---|
| ⏰ | Tab timer with custom time | タブへのタイマー設定 |
| 📋 | Reminder note shown on overlay | やること表示オーバーレイ |
| 💤 | Snooze (preset + custom datetime) | スヌーズ（プリセット＋日時指定） |
| ✉️ | Email notification via SendGrid | SendGrid経由のメール通知 |
| 🔔 | OS notification + tab title blink | OS通知＋タブタイトル点滅 |
| 🌐 | Japanese / English UI | 日本語・英語切替 |
| 🔒 | Closed-tab detection | タブを閉じた際のメール通知 |

---

## Installation / インストール

### Firefox
1. Open `about:debugging` → This Firefox
2. Click "Load Temporary Add-on"
3. Select `manifest.json`

### Chrome / Edge
1. Open `chrome://extensions` → Enable Developer mode
2. Click "Load unpacked"
3. Select the `atolater/` folder

---

## Setup / セットアップ

### Email notifications (optional) / メール通知（任意）

This extension uses **your own SendGrid account** to send emails.  
No data is sent to any third-party server other than SendGrid.

1. Create a free account at https://sendgrid.com (100 emails/day free)
2. Complete **Domain Authentication** for your sender domain
3. Create an API key with **Mail Send** permission only
4. Open the extension popup → Settings tab → enter your API key and email addresses

---

## File Structure / ファイル構成

```
atolater/
├── manifest.json        # MV3 manifest (Firefox + Chrome)
├── src/
│   ├── background.js    # Service worker: alarms, email, tab detection
│   ├── content.js       # Overlay UI injected into pages
│   ├── popup.html       # Extension popup
│   ├── popup.js         # Popup logic
│   └── i18n.js          # Japanese / English strings
├── icons/
│   ├── icon48.png
│   └── icon128.png
└── server/
    └── send-mail.php    # Optional self-hosted mail API (not required)
```

---

## Privacy / プライバシー

- All settings (API key, email addresses) are stored in **browser local storage only**
- No data is collected or sent to any server operated by this extension
- Email notifications are sent directly from your browser to **SendGrid's API** using your own API key

---

## License

MIT License — see [LICENSE](LICENSE)
