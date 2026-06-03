# Watch Later (あとで見る)

A Firefox / Chrome browser extension that lets you set a timer on any tab. When the timer fires, the tab comes to the front with an overlay showing your reminder note.

## Features

- **Tab timer** — set a time for any tab to resurface
- **Reminder overlay** — a full-page overlay shows your note when the timer fires
- **Editable memo on snooze** — edit your reminder note directly in the overlay before snoozing
- **Title blink** — the tab title blinks so you notice even when on another tab
- **Snooze** — snooze for 5 / 15 / 60 minutes (configurable)
- **Email notification** — get an email when the timer fires (via your own SendGrid account)
- **Closed-tab alert** — if you accidentally close a scheduled tab, an email is sent
- **Bilingual UI** — Japanese / English, auto-detected from browser language with manual toggle
- **Firefox + Chrome** — built on WebExtensions MV3, works on both browsers

## Installation

### Firefox (temporary / development)
1. Open `about:debugging` → **This Firefox**
2. Click **Load Temporary Add-on**
3. Select `manifest.json` inside the extracted folder

### Chrome / Edge
1. Open `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked**
3. Select the extracted `atolater/` folder

## Email Notifications (optional)

Email notifications use **your own SendGrid account** — no server required.

1. Create a free account at [sendgrid.com](https://sendgrid.com) (100 emails/day free)
2. Go to **Settings → Sender Authentication** and verify your sender address
3. Go to **Settings → API Keys** → create a key with **Mail Send** permission only
4. Open the extension → **Settings tab** → enter your API key, from address, and default recipient

> **Privacy note:** Your SendGrid API key is stored in `browser.storage.local` on your device only. It is never sent anywhere except directly to the SendGrid API when sending a notification email.

## Permissions

| Permission | Reason |
|-----------|--------|
| `tabs` | Read the current tab URL and title; bring a tab to the front when its timer fires |
| `alarms` | Schedule timers that survive browser sleep |
| `storage` | Save schedules and settings locally |
| `notifications` | Show a browser notification when the timer fires |
| `<all_urls>` | Inject the reminder overlay into any page when its timer fires |

## File Structure

```
atolater/
├── manifest.json
├── icons/
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── background.js   # Alarm engine, email, tab watcher
    ├── content.js      # Overlay injected into pages
    ├── i18n.js         # Bilingual strings (ja / en)
    ├── popup.html      # Extension popup UI
    └── popup.js        # Popup logic
```

## Privacy Policy

This extension does not collect, transmit, or share any personal data.

- All schedules and settings are stored locally in your browser (`browser.storage.local`)
- If you configure SendGrid email notifications, your API key is stored locally and used only to call the SendGrid API directly from your browser
- No analytics, no tracking, no external servers owned by this extension

## License

MIT
