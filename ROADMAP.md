# MarkIt – Development Roadmap

Below is a modular, step-by-step plan to build **MarkIt**. Each task is a checkbox so we can tick items off as we progress.

> **Tip:** Use Git commits that reference the step numbers (e.g., `feat(core): 2.1 implement highlight wrapper`).

---

## 0️⃣ Project Setup

- [x] 0.1 Create `MarkIt` repo & directory structure (`src`, `dist`, `assets`, etc.)
- [x] 0.2 Initialize `npm` / `pnpm` workspace & ESLint + Prettier configs
- [x] 0.3 Add CI lint + test workflow (GitHub Actions)

## 1️⃣ Manifest & Base Files

- [x] 1.1 Draft `manifest.json` (MV3) with minimal permissions (`activeTab`, `storage`)
- [x] 1.2 Add extension icons (16, 48, 128)
- [x] 1.3 Wire up `background.js` (service worker) placeholder

## 2️⃣ Core Highlighting Engine

- [x] 2.1 Implement content script to capture text selection
- [x] 2.2 Inject highlight `<span>` with yellow background on `Ctrl+Shift+H`
- [x] 2.3 Store anchor info (selected text + XPath / range, text node index, and context snippet) in memory
- [x] 2.4 Support multi-node highlights (across elements/text nodes)
- [x] 2.5 Robustly wrap all text nodes in range for highlight
- [x] 2.6 Add accessibility attributes and robust CSS to highlight spans
- [x] 2.7 Skip highlighting inside editors, inputs, and contenteditable
- [x] 2.8 Implement efficient DOM manipulation:
  - Use DocumentFragment for batch updates
  - Preserve original text node structure
  - Handle overlapping highlights
  - Implement range boundary comparison
  - Add smooth transitions
- [x] 2.9 Add style injection with fallbacks:
  - Global style rule with `!important`
  - Fallback to inline styles
  - CSS variables for customization
  - Border and padding for visibility
  - Transition effects

## 3️⃣ Storage & Sync

- [x] 3.1 Persist highlights to `chrome.storage.sync` keyed by normalized page URL (origin + pathname)
- [x] 3.2 Restore highlights on page load
- [x] 3.3 Use `MutationObserver` (debounced) to re-apply after dynamic DOM changes
- [x] 3.4 Use text-based fallback anchoring if XPath fails
- [x] 3.5 Efficient storage structure for quota safety
- [x] 3.6 Implement storage optimizations:
  - Compressed highlight data
  - Batch operations
  - Quota exceeded handling
  - Invalid entry cleanup
  - Cross-device sync
- [x] 3.7 Add storage schema validation and migration

## 4️⃣ Popup UI

- [x] 4.1 Scaffold popup HTML/CSS/JS (plain, accessible, modern)
- [x] 4.2 Display list of highlights for current tab
- [x] 4.3 Add **Jump to Highlight** functionality
- [x] 4.4 Add per-item 🗑 delete button
- [x] 4.5 Add **Delete All** & **Toggle Visibility** buttons
- [x] 4.6 Add settings modal (color picker, export/import, sync info)
- [x] 4.7 Add delete confirmation modal and toast notifications
- [x] 4.8 Handle restricted pages with a clear message

## 5️⃣ Context Menu Integration

- [x] 5.1 Create context menu items: **Highlight with MarkIt**, **Remove Highlight**
- [x] 5.2 Connect menu actions to content script via `chrome.runtime.sendMessage`

## 6️⃣ Highlight Removal

- [x] 6.1 Implement remove-highlight handler in content script
- [x] 6.2 Sync storage after removal
- [x] 6.3 Update popup UI in real-time via message passing

## 7️⃣ Fallback & Restriction Handling

- [x] 7.1 Detect restricted pages (try injection, catch exceptions)
- [x] 7.2 Show tooltip/popup note when unsupported
- [x] 7.3 Grey-out or disable UI on blocked domains
- [x] 7.4 Text-based fallback anchoring for robust restoration

## 8️⃣ Polish & UX Improvements

- [x] 8.1 Keyboard shortcut customization UI (planned)
- [x] 8.2 Color picker for highlight color
- [x] 8.3 Dark mode styling (planned)
- [x] 8.4 Subtle animations & tooltips
- [x] 8.5 Accessibility improvements (role, aria-label)

## 9️⃣ Packaging & Testing

- [x] 9.1 Write end-to-end tests (e.g., using Playwright)
- [x] 9.2 Manual cross-browser/device testing
- [x] 9.3 Generate production build & zip
- [x] 9.4 Validate submission to Chrome Web Store (Web Store dashboard)

## 🔟 Advanced Robustness & Compatibility

- [x] 10.1 Iframe support (all_frames, dynamic injection)
- [x] 10.2 Shadow DOM support (recursive XPath search)
- [x] 10.3 SPA/hashchange support (re-apply on navigation)
- [x] 10.4 Performance optimizations for large/dynamic pages
- [x] 10.5 Storage quota awareness and efficient structure
- [x] 10.6 Security enhancements:
  - CSP compliance
  - Safe DOM manipulation
  - XPath sanitization
  - Cross-origin handling
  - Minimal permissions
- [x] 10.7 Error handling improvements:
  - Graceful fallbacks
  - User-friendly messages
  - Recovery mechanisms
  - Logging and debugging
  - Cross-browser compatibility

## 🔄 Future Technical Improvements

- [ ] 11.1 Performance optimizations:
  - Highlight batching
  - Page caching
  - Web Workers
  - Lazy loading
  - Text node optimization
- [ ] 11.2 Storage improvements:
  - IndexedDB integration
  - Data compression
  - Version control
  - Automatic cleanup
  - Sync enhancements
- [ ] 11.3 Feature enhancements:
  - Highlight merging
  - Per-highlight colors
  - Annotations
  - Export/import
  - Keyboard navigation
  - Dark mode
  - Read mode

## 📡 Message Passing & State Management

- [ ] 12.1 Implement robust message passing:
  - Background to content script
  - Popup to content script
  - Cross-frame communication
  - Real-time updates
  - Error handling
- [ ] 12.2 Add state management:
  - Highlight state
  - UI state
  - Storage state
  - Error state
  - Recovery mechanisms
- [ ] 12.3 Improve initialization:
  - Race condition prevention
  - Memory management
  - Resource cleanup
  - Error recovery
  - State persistence
- [ ] 12.13 Further improve jump-to-highlight reliability (handle SPA, dynamic content, iframes, shadow DOM, and cross-frame navigation)

## 🌐 Cross-Browser Support

- [ ] 13.1 Add feature detection:
  - Modern APIs
  - DOM features
  - Storage APIs
  - CSS features
  - JavaScript features
- [ ] 13.2 Implement polyfills:
  - Modern JavaScript
  - CSS features
  - DOM APIs
  - Storage APIs
  - Event handling
- [ ] 13.3 Add browser-specific fixes:
  - Chrome
  - Firefox
  - Safari
  - Edge
  - Mobile browsers

## 1️⃣1️⃣ Recent Advanced Features & Robustness (NEW)

- [x] 11.1 Per-highlight color tagging (color property, color picker, swatch, apply button, real-time update)
- [x] 11.2 Hybrid storage: fallback to `chrome.storage.local` when sync quota is hit, merge highlights from both in UI and content script
- [x] 11.3 Storage chunking: store highlights in chunks to avoid per-item quota
- [x] 11.4 Automatic cleanup of old highlights (older than 1 week) from both sync and local storage
- [x] 11.5 Local-only indicator: show (local) badge in popup for highlights only in local storage
- [x] 11.6 Unified highlight retrieval logic in popup and content script (merge sync+local, deduplicate)
- [x] 11.7 Robust quota error handling: retry with local, only alert if both are full
- [x] 11.8 Bugfix: color changes are applied immediately in the DOM after clicking "Apply Color" in the popup
- [x] 11.9 Seamless support for all highlight actions (color, delete, jump) for both sync and local-only highlights
- [x] 11.10 Popup UI/UX: modern cards, color controls, accessibility, keyboard navigation, toast notifications

## 1️⃣2️⃣ Known Limitations & Future Enhancements (UPDATED)

- [ ] 12.1 Export/import currently only works for sync highlights (not local-only)
- [ ] 12.2 Consider IndexedDB for unlimited storage and backup
- [ ] 12.3 Add export/import for local-only highlights
- [ ] 12.4 Highlight merging for overlapping selections
- [ ] 12.5 Annotation/comments per highlight
- [ ] 12.6 Dark mode and advanced theming
- [ ] 12.7 Read mode and advanced search
- [ ] 12.8 Further optimize for extremely large/dynamic pages
- [ ] 12.9 Add cloud backup (Google Drive, Dropbox, etc.)
- [ ] 12.10 Add user-driven sync controls (pin, archive, etc.)
- [ ] 12.11 Support for annotation sharing/collaboration
- [ ] 12.12 Export/import for all highlights (sync+local) in one file
- [ ] 12.13 Further improve jump-to-highlight reliability (handle SPA, dynamic content, iframes, shadow DOM, and cross-frame navigation)

## 2️⃣0️⃣ Phase 2 Development Plan (Planned)

Phase 2 focuses on advanced features, scalability, and user experience improvements to make MarkIt a best-in-class highlighting and annotation tool. Each item below is a major enhancement for power users, large-scale usage, or collaborative/backup scenarios.

- [ ] **Full Export/Import (Sync + Local Highlights)**
  - Allow users to export and import all highlights (including local-only) in a single file for true backup and migration.
  - User impact: No data loss, easy migration, and full backup/restore.

- [ ] **IndexedDB Migration for Unlimited Storage**
  - Move highlight storage from `chrome.storage` to IndexedDB for virtually unlimited capacity and faster access.
  - User impact: No more quota issues, supports thousands of highlights per page/site.
  - Technical: Requires migration logic and new storage API wrappers.

- [ ] **Annotations & Comments**
  - Allow users to add notes/comments to each highlight.
  - User impact: Richer context, research, and study workflows.
  - Technical: Extend highlight schema, update UI, and sync logic.

- [ ] **Highlight Merging & Overlap Handling**
  - Merge overlapping or adjacent highlights for a cleaner experience.
  - User impact: No duplicate or fragmented highlights, easier management.
  - Technical: Requires range merging logic and UI updates.

- [ ] **Dark Mode & Advanced Theming**
  - Add dark mode and custom themes for accessibility and user preference.
  - User impact: Better readability, accessibility, and visual comfort.
  - Technical: CSS variables, theme switcher, and popup/content script support.

- [ ] **Cloud Backup & Sync (Google Drive, Dropbox, etc.)**
  - Allow users to back up and sync highlights to their own cloud storage.
  - User impact: Unlimited, portable, and user-controlled backup.
  - Technical: OAuth integration, cloud API, and privacy controls.

- [ ] **Advanced Search & Read Mode**
  - Add full-text search across all highlights and a distraction-free reading mode.
  - User impact: Quickly find and review highlights, better study/reading experience.
  - Technical: Search index, UI, and content script integration.

- [ ] **Sharing & Collaboration**
  - Allow users to share highlights/annotations with others or collaborate in real time.
  - User impact: Group research, teaching, and collaborative workflows.
  - Technical: Sharing links, permissions, and real-time sync.

- [ ] **User-Driven Sync Controls (Pin, Archive, etc.)**
  - Let users choose which highlights are synced, archived, or local-only.
  - User impact: More control over sync quota and privacy.
  - Technical: UI for pin/archive, sync logic, and storage management.

- [ ] **Performance Optimizations for Large/Dynamic Pages**
  - Further optimize highlight restoration, search, and UI for very large or dynamic web pages.
  - User impact: Fast, smooth experience even on heavy sites.
  - Technical: Batching, lazy loading, and efficient DOM traversal.

---

### Legend

✅ = complete | 🚧 = in progress | ❌ = removed / postponed

Keep this roadmap updated as work progresses! 🚀 

// Add a global style rule for the highlight span
const style = document.createElement('style');
style.textContent = '.markit-highlight { background-color: yellow !important; }';
document.head.appendChild(style); 