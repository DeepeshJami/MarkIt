# MarkIt – Persistent Text Highlighter Extension

> **Tagline:** *"Highlight the Web. Keep What Matters."*

MarkIt is a Chrome extension that lets you highlight text on almost any webpage and keep those highlights synced across sessions **and devices**. It is designed to be robust, accessible, and work on a wide variety of websites—including SPAs, iframes, and shadow DOMs.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/your-extension-id?label=Chrome%20Web%20Store)](https://chrome.google.com/webstore/detail/your-extension-id)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## 🌟 Features

- **Robust Multi-Node Text Highlighting**
  - Select text (even across multiple elements or lines) and highlight it
  - Keyboard shortcut (Ctrl+Shift+H) and context menu support
  - Highlights are injected as span wrappers with accessibility attributes
  - Supports overlapping and adjacent highlights
  - Avoids nesting for clean DOM structure

- **Persistent Storage & Sync**
  - Uses Chrome's storage API for persistence
  - Cross-device sync support
  - Efficient storage structure
  - Automatic cleanup of old highlights
  - Export/Import functionality

- **Modern Popup UI**
  - List all highlights for the current page
  - Search through highlights
  - Jump to, delete, or toggle visibility
  - Color customization
  - Settings modal with sync info
  - Toast notifications for feedback

- **Dynamic Content Support**
  - Works on SPAs and dynamic pages
  - Handles iframes and shadow DOM
  - Text-based fallback anchoring
  - Robust restoration after DOM changes

## 🚀 Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/detail/your-extension-id)
2. Click "Add to Chrome"
3. Confirm the installation

### From Source
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/markit.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   node build.js
   ```
4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## 🛠️ Development

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Chrome browser

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   node build.js
   ```

3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

### Project Structure
```
markit/
├── src/                    # Source files
│   ├── contentScript.js    # Content script for highlighting
│   ├── popup.html          # Popup UI
│   ├── popup.js            # Popup logic
│   ├── popup.css           # Popup styles
│   ├── background.js       # Background service worker
│   └── manifest.json       # Extension manifest
├── assets/                 # Static assets
│   └── icons/             # Extension icons
├── dist/                   # Build output
├── build.js               # Build script
├── package.json           # Project configuration
└── README.md             # Project documentation
```

### Scripts
- `npm run build` - Build the extension
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Chrome Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)

## 📞 Support

- [GitHub Issues](https://github.com/your-username/markit/issues)
- [Chrome Web Store Support](https://chrome.google.com/webstore/detail/your-extension-id/support)

## 🔄 Updates

Check the [CHANGELOG.md](CHANGELOG.md) for a list of changes and updates.

---

## 🌟 Key Features

1. **Robust Multi-Node Text Highlighting**
   - Select text (even across multiple elements or lines) and highlight it with a keyboard shortcut or context menu.
   - Highlights are injected as span wrappers with accessibility attributes (`role="mark"`, `aria-label="highlight"`).
   - Supports overlapping and adjacent highlights, and avoids nesting.

2. **Persistent Storage & Sync**
   - Uses `chrome.storage.sync` to store highlights keyed by normalized page URL (origin + pathname).
   - Highlights are re-injected on page load, after navigation, and after dynamic content changes.
   - Efficient storage structure to avoid quota issues.

3. **Popup UI – Manage Highlights**
   - Modern, accessible popup lists all highlights for the current page.
   - Jump to, delete, or toggle visibility of highlights.
   - Settings modal: choose highlight color, export/import highlights, view sync info.
   - Delete confirmation modal and toast notifications for user feedback.
   - Handles restricted pages (chrome://, file://, Chrome Web Store) with a clear message.

4. **Dynamic Content & SPA Support**
   - Uses a debounced `MutationObserver` to re-apply highlights after DOM changes (e.g., AJAX, infinite scroll).
   - Listens for `popstate` and `hashchange` events to restore highlights on SPA navigation.

5. **Iframe & Shadow DOM Support**
   - Content script runs in all frames (iframes) and recurses into shadow roots for highlight restoration.

6. **Text-Based Fallback Anchoring**
   - If XPath-based restoration fails (e.g., after major DOM changes), uses a snippet of surrounding text to find and re-apply highlights.

7. **Accessibility & CSS Robustness**
   - Highlights use `role="mark"`, `aria-label="highlight"`, and robust CSS (`!important` on all styles).
   - User-customizable highlight color.
   - Skips highlighting inside `<input>`, `<textarea>`, and `[contenteditable]` elements.

8. **Performance**
   - Debounced DOM observation and efficient restoration logic for large or dynamic pages.

---

## 🛡️ Permissions & Fallback Handling

| Permission | Why it's needed |
|------------|-----------------|
| `activeTab` | interact with the current page |
| `scripting` | inject content scripts dynamically |
| `storage`   | save & sync highlights |
| `contextMenus` | add right-click menu actions |
| `host_permissions` | enable operation on `http://*/*` & `https://*/*` |

**Restricted Pages** (e.g., `chrome://`, Chrome Web Store, some Google properties) block content scripts. MarkIt detects this and displays:

> "MarkIt can't highlight this page due to browser or site restrictions."

---

## ⚙️ Technical Stack

- Manifest **v3**
- **Content Scripts** for DOM interaction (all frames, shadow DOM aware)
- **MutationObserver** for SPA / dynamic pages
- **Chrome Storage Sync** for persistence
- **Context Menu API** for right-click support
- **Popup UI** (HTML/CSS/JS)
- **Security & Performance:**
  - CSP-compliant style injection
  - Safe DOM manipulation (no eval/innerHTML)
  - Debounced observers (200ms)
  - RequestAnimationFrame for smooth updates
  - Efficient text node traversal
  - Memory leak prevention
  - Storage quota management
- **Storage Schema:**
  ```javascript
  {
    highlights: {
      [normalizedUrl]: [
        {
          text: string,
          startParentXPath: string,
          startTextNodeIndex: number,
          startOffset: number,
          endParentXPath: string,
          endTextNodeIndex: number,
          endOffset: number,
          contextBefore: string,
          contextAfter: string,
          createdAt: number
        }
      ]
    }
  }
  ```
- (Optional) Firebase + Google OAuth for full-stack syncing
- **Message Passing System:**
  - Background script to content script communication
  - Popup to content script communication
  - Real-time UI updates
  - Error handling and retry logic
  - Message queue for reliability
- **Initialization System:**
  - Duplicate initialization prevention
  - Cleanup on page unload
  - Memory leak prevention
  - State management
  - Error recovery
- **Cross-Browser Compatibility:**
  - Feature detection
  - Polyfills
  - Vendor prefixes
  - Fallback implementations
  - Browser-specific fixes

---

## 💡 Bonus Ideas

- Per-highlight color and annotation
- Export highlights as **Markdown / JSON**
- Keyboard navigation in popup
- Dark-mode-aware UI
- "Read mode" that hides everything except highlighted text
- Storage quota warnings and advanced export/import

---

## 📦 Deliverables

- Production-ready extension zipped for Chrome Web Store
- Clean, modular codebase (popup, background, content scripts)
- Modern UI & thoughtful UX (tooltips, fallbacks, subtle animations)
- Clear, minimal permissions in `manifest.json`
- Screenshots/GIF demos ready for sharing on LinkedIn

---

## 📣 Branding Assets

- Name: **MarkIt**
- Icon suggestions: Yellow highlighter / glowing marker
- Sizes: `16×16`, `48×48`, `128×128`

---

## 🧪 Testing & Compatibility

- Tested on static, dynamic, SPA, iframe, and shadow DOM sites
- Verified highlight visibility and persistence after reload and navigation
- Confirmed keyboard shortcut and context menu functionality
- Tested cross-device sync functionality
- Verified highlight restoration after page reload and SPA navigation
- Tested fallback restoration after DOM changes

---

## 🔒 Security & Performance

- **Security Measures:**
  - Minimal permissions model
  - CSP compliance
  - Safe DOM manipulation
  - XPath sanitization
  - Cross-origin restrictions handling
  - No eval or innerHTML usage
  - Secure storage practices

- **Performance Optimizations:**
  - Debounced DOM observation (200ms)
  - Efficient text node traversal
  - Minimal DOM operations
  - RequestAnimationFrame for smooth updates
  - Memory leak prevention
  - Storage quota management
  - Batch operations for efficiency

- **Error Handling:**
  - Graceful fallbacks for XPath failures
  - Storage quota exceeded handling
  - DOM manipulation error recovery
  - Cross-origin iframe restrictions
  - CSP compliance checks
  - User-friendly error messages

## 📈 Future Technical Roadmap

- **Performance:**
  - Highlight batching for large pages
  - Caching for frequent pages
  - Web Workers for heavy operations
  - Lazy loading of highlights
  - Optimized text node traversal

- **Storage:**
  - IndexedDB for larger datasets
  - Highlight compression
  - Versioning for conflict resolution
  - Automatic cleanup of invalid entries
  - Cross-device sync improvements

- **Features:**
  - Highlight merging
  - Per-highlight colors
  - Annotation support
  - Export/import improvements
  - Keyboard navigation
  - Dark mode
  - Read mode

## 🔄 Message Passing & State Management

- **Communication System:**
  - Background script to content script
  - Popup to content script
  - Cross-frame communication
  - Real-time updates
  - Error handling

- **State Management:**
  - Highlight state
  - UI state
  - Storage state
  - Error state
  - Recovery mechanisms

- **Initialization & Cleanup:**
  - Race condition prevention
  - Memory management
  - Resource cleanup
  - Error recovery
  - State persistence

## 🌐 Cross-Browser Support

- **Feature Detection:**
  - Modern APIs
  - DOM features
  - Storage APIs
  - CSS features
  - JavaScript features

- **Polyfills & Fallbacks:**
  - Modern JavaScript
  - CSS features
  - DOM APIs
  - Storage APIs
  - Event handling

- **Browser-Specific Fixes:**
  - Chrome
  - Firefox
  - Safari
  - Edge
  - Mobile browsers

---

*Last updated: [Current Date]* 