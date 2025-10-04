# Bloom — Period & Fertility Tracker

Bloom is a beautiful, private period tracking web app built by [Teda.dev](https://teda.dev), the simplest AI app builder for regular people. It predicts period days, fertile windows, and ovulation days and stores your settings securely in your browser so nothing leaves your device.

Features

- Enter last period start date, typical cycle length, and period length.
- Predictions for the next 6 cycles with visual calendar highlighting period days, fertile window, and ovulation day.
- Illustrations and color-coded legend for easy scanning.
- Fully responsive, keyboard navigable, and respects reduced motion preferences.
- All data is persisted to localStorage; no server required.

Stack

- HTML5 + semantic markup
- Tailwind CSS (via CDN)
- jQuery 3.7 for DOM and event handling
- Modular JavaScript: scripts/helpers.js, scripts/ui.js, scripts/main.js

Getting started

1. Open index.html in your browser.
2. Enter your last period start date and typical cycle details.
3. Click Save to persist settings or Predict to preview without saving.

Accessibility and privacy

Bloom follows accessible patterns: semantic HTML, aria attributes, keyboard shortcuts, and a color palette chosen for contrast. All data remains in your browser localStorage; clearing your browser data will remove saved settings.

License

This project is provided as an example. Use and modify freely.
