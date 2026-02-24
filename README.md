# Swiggy Food Agent – Chrome Extension

Order food on Swiggy using natural language in a side-panel chat. The agent uses Claude to understand the page DOM and perform actions (search, filter, add to cart, checkout with COD).

## Setup

1. **Build**
   ```bash
   npm install
   npm run build
   ```

2. **Load in Chrome**
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

3. **Configure**
   - Click the extension icon to open the side panel
   - Click the gear icon and either:
     - **Direct mode**: Set your Anthropic API key (stored locally only)
     - **Proxy mode**: Set a backend URL (e.g. `http://localhost:3000`) and run the proxy server with your API key

4. **Optional backend proxy**
   ```bash
   ANTHROPIC_API_KEY=your_key npm run server
   ```
   Then set Backend URL in extension settings to `http://localhost:3000`.

## How to test

1. Open [Swiggy](https://www.swiggy.com) in a tab (and log in if required).
2. Open the extension side panel (click the extension icon).
3. Send a message, e.g.:
   - "Search for pizza near me"
   - "Show restaurants with rating above 4"
   - "Order 2 paneer butter masala from a nearby restaurant"

The agent will take over the Swiggy tab, read the page, and use tools (click, type, scroll, etc.) to fulfill your request. It will ask for confirmation before adding items to cart or placing the order, and defaults to COD.

## Project structure

- `src/sidepanel/` – Chat UI (React)
- `src/background/` – Agent loop, Claude API client, tool definitions
- `src/content/` – DOM snapshot and action execution on Swiggy pages
- `src/shared/` – Types and message helpers
- `src/server/` – Optional Express proxy for Anthropic API

## Scripts

- `npm run build` – Production build into `dist/`
- `npm run dev` – Watch build for development
- `npm run server` – Start optional proxy server (set `ANTHROPIC_API_KEY`)
