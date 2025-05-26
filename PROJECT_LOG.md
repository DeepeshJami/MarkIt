# MarkIt Project Development Log

## Project Overview
MarkIt is a Chrome extension that enables persistent text highlighting across web pages, with sync capabilities, robust restoration, and a user-friendly interface. It is designed to work on a wide variety of websites, including SPAs, iframes, and shadow DOMs, and to be resilient to DOM changes.

## Development Timeline

### Module 0: Project Setup (✅ Completed)
- Created project structure with `src/`, `dist/`, `assets/` directories
- Set up development environment:
  - `package.json` with ESLint & Prettier
  - `.eslintrc.json` with recommended rules
  - `.prettierrc` for consistent formatting
  - `.gitignore` for Node.js projects
- Added GitHub Actions CI workflow for linting

### Module 1: Manifest & Base Files (✅ Completed)
- Created `manifest.json` (MV3) with:
  - Basic permissions: `activeTab`, `storage`, `contextMenus`, `scripting`
  - Host permissions for `http://*/*` and `https://*/*`
  - Keyboard shortcut: `Ctrl+Shift+H`
- Added placeholder `background.js` service worker
- Prepared `assets/icons/` directory for future icon assets

### Module 2: Core Highlighting Engine (✅ Completed)
- Implemented content script (`contentScript.js`) for text selection
- Added robust multi-node highlight functionality:
  - Supports highlights spanning multiple elements and text nodes
  - Stores parent XPath, text node index, and offsets for both start and end of selection
  - Stores context snippets (before/after) for text-based fallback anchoring
  - Handles overlapping highlights by avoiding nesting
  - Preserves original text node structure
  - Uses DocumentFragment for efficient DOM manipulation
  - Implements range boundary point comparison for accurate text node selection
- Added context menu and keyboard shortcut support
- Added error handling for unsupported selections (e.g., across editors/inputs)
- Implemented highlight style injection:
  - Global style rule with `!important` flags
  - Fallback to inline styles if global injection fails
  - Customizable highlight color with CSS variables
  - Border and padding for better visibility
  - Smooth transitions for highlight effects
- Implemented message passing system:
  - Background script to content script communication
  - Popup to content script communication
  - Real-time UI updates
  - Error handling and retry logic
  - Message queue for reliability
- Added initialization safeguards:
  - Check for duplicate initialization
  - Cleanup on page unload
  - Memory leak prevention
  - State management
  - Error recovery

### Module 3: Storage & Sync (✅ Completed)
- Implemented persistent storage using `chrome.storage.sync`:
  - Highlights stored by normalized URL (origin + pathname)
  - Cross-device sync support
  - Efficient storage structure:
    - Compressed highlight data (minimal properties)
    - Batch operations for quota efficiency
    - Error handling for quota exceeded
    - Automatic cleanup of invalid entries
  - Storage schema:
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
- Added storage migration system:
  - Version tracking
  - Schema updates
  - Data validation
  - Cleanup of old data
  - Error recovery
- Implemented storage quota management:
  - Size estimation
  - Batch operations
  - Cleanup strategies
  - User notifications
  - Fallback options
- Added highlight restoration:
  - Automatic restoration on page load
  - Robust restoration using XPath, text node index, and context fallback
  - Error handling for missing elements or text nodes
- Implemented dynamic content handling:
  - MutationObserver for DOM changes, debounced for performance
  - Re-applies highlights on SPA navigation and hash changes
- Added highlight removal functionality:
  - Context menu integration
  - Storage sync after removal
  - Memory cleanup

### Module 4: Popup UI (✅ Completed)
- Modern, accessible popup UI with:
  - List of highlights for the current page
  - Jump and Delete buttons for each highlight
  - Toggle visibility and Delete All buttons
  - Keyboard shortcut hint and version info
  - Settings modal with color picker, export/import, and sync info
  - Delete confirmation modal and toast notifications
- Handles restricted pages (chrome://, file://, Chrome Web Store) with a clear message
- Added real-time synchronization:
  - Live highlight updates
  - State management
  - Error handling
  - Loading states
  - Offline support
- Implemented UI performance optimizations:
  - Virtual scrolling for large lists
  - Lazy loading of highlights
  - Debounced search
  - Cached DOM queries
  - Efficient event handling

### Module 5: Advanced Features, Storage Robustness, and UI Improvements (✅ Completed)

- **Per-Highlight Color Tagging:**
  - Each highlight now stores its own `color` property, set at creation and editable from the popup.
  - Popup UI updated to show a color swatch and color picker for each highlight.
  - Color changes are only applied after clicking an "Apply Color" button, providing user control and immediate feedback.
  - Color changes are reflected both in the popup and on the page in real time.
  - Highlights are rendered with their individual colors using inline styles with `!important` for robustness.

- **Hybrid Storage (Sync + Local Fallback):**
  - Highlights are saved to `chrome.storage.sync` until the quota is reached.
  - If the sync quota is exceeded, new highlights are automatically saved to `chrome.storage.local` (local-only, not synced across devices).
  - Both sync and local highlights are merged and restored on the page, with local-only highlights marked in the popup UI.
  - The popup now reads from both storage areas, ensuring all highlights are visible regardless of where they are stored.
  - Each highlight has a `localOnly` flag if it is only stored locally, and a `(local)` indicator is shown in the popup.

- **Storage Chunking and Quota Handling:**
  - Highlights are stored in chunks (default 20 per chunk) to avoid Chrome's per-item sync quota.
  - Automatic cleanup of old highlights (older than 1 week) from both sync and local storage to free up space.
  - If both sync and local storage are full, the user is notified and prompted to delete highlights.
  - Storage functions are optimized to only store essential fields, reducing storage footprint.

- **Popup UI and UX Enhancements:**
  - Modern, card-based UI for highlights, with color swatches, search, jump, delete, and settings.
  - Color picker popup with "Apply Color" button for explicit color changes.
  - Local-only highlights are clearly indicated in the UI.
  - Robust error handling and toast notifications for all user actions.
  - Real-time updates: color changes, deletions, and new highlights are reflected immediately in both the popup and the page.
  - Improved accessibility and keyboard navigation.

- **Content Script Robustness:**
  - Restoration logic merges highlights from both sync and local storage, ensuring all highlights are restored regardless of storage location.
  - All highlight operations (add, remove, update color) work seamlessly across both storage types.
  - SPA navigation, hash changes, and dynamic content are handled with debounced MutationObserver and event listeners.
  - Highlights are never lost due to storage limits; local fallback ensures persistence.

- **Technical Details:**
  - All storage keys are normalized using `origin + pathname` for consistency.
  - Highlights are uniquely identified by `createdAt` timestamps.
  - All message passing and highlight operations are robust to async errors and race conditions.
  - The codebase is modular, maintainable, and well-logged for debugging.

#### User-Facing Effects
- Users can now create unlimited highlights per page (within local storage limits), even after sync quota is reached.
- All highlights are visible and editable in the popup, with local-only highlights clearly marked.
- Per-highlight color is fully supported and easy to use.
- The extension is robust, fast, and user-friendly, with clear feedback and error handling.

#### Additional Specifics
- **Bugfix: Immediate Color Update**
  - Fixed an issue where highlight color changes were not reflected on the page until refresh. Now, color changes are applied instantly in the DOM when the "Apply Color" button is pressed in the popup, using robust message passing and style updates in the content script.

- **Popup/Content Script Synchronization**
  - Unified highlight retrieval logic between popup and content script. Both now merge highlights from sync and local storage, ensuring the popup always displays all highlights present on the page, regardless of storage location.

- **Robust Storage Quota Handling**
  - Implemented a fallback and retry mechanism: if saving to sync storage fails due to quota, the extension automatically retries with local storage. The user is only notified if both storage areas are full, preventing unnecessary alerts.

- **Seamless Local-Only Highlight Actions**
  - All highlight actions (color change, delete, jump) are supported for both sync and local-only highlights. The popup and content script handle the distinction transparently, ensuring a consistent user experience.

- **Export/Import Limitation**
  - The export/import feature currently only exports/imports highlights from sync storage. Local-only highlights are not included in export/import operations. Users should be aware of this limitation if they rely on local-only highlights for backup.

### Advanced Robustness & Compatibility (✅ Completed)
- **Iframe support:** Content script runs in all frames; highlights work in iframes
- **Shadow DOM support:** XPath search recurses into shadow roots for restoration
- **SPA/hashchange support:** Listens for `popstate` and `hashchange` to re-apply highlights
- **Text-based fallback anchoring:** If XPath fails, uses context snippet to find and restore highlights
- **Accessibility:** Highlights use `role="mark"` and `aria-label="highlight"`
- **CSS robustness:** All highlight styles use `!important` and are customizable
- **Performance:** MutationObserver is debounced; restoration is efficient even on large pages
- **Editor/input safety:** Skips highlighting inside `<input>`, `<textarea>`, and `[contenteditable]` elements
- **Storage quota awareness:** Uses efficient storage structure and warns on quota issues
- **Performance optimizations:**
  - Debounced MutationObserver (200ms)
  - RequestAnimationFrame for DOM updates
  - Efficient text node traversal
  - Minimal DOM operations
  - Memory leak prevention
- **Error handling:**
  - Graceful fallbacks for XPath failures
  - Storage quota exceeded handling
  - DOM manipulation error recovery
  - Cross-origin iframe restrictions
  - CSP (Content Security Policy) compliance
- **Security considerations:**
  - Sanitized XPath expressions
  - Safe DOM manipulation
  - No eval or innerHTML usage
  - Minimal permissions
  - CSP-compliant style injection
- **Message passing reliability:**
  - Retry mechanism
  - Timeout handling
  - Error recovery
  - State synchronization
  - Cross-frame communication
- **Initialization robustness:**
  - Race condition prevention
  - State recovery
  - Error handling
  - Cleanup procedures
  - Memory management
- **Cross-browser compatibility:**
  - Feature detection
  - Polyfills
  - Vendor prefixes
  - Fallback implementations
  - Browser-specific fixes

## Current Status
- Highlights work across a wide variety of websites, including SPAs, iframes, and shadow DOMs
- Robust restoration even if the DOM changes (using context fallback)
- Accessible, modern UI with settings, export/import, and notifications
- Handles restricted pages gracefully
- Debug logging in place for troubleshooting

## Known Issues & Future Enhancements
- Some edge cases in highly obfuscated or virtualized DOMs may still fail
- Further optimizations possible for extremely large or dynamic pages
- Potential for per-highlight color, merging, or advanced export formats
- Consider adding support for annotation, comments, or sharing
- **Technical debt:**
  - Consider using WeakMap for highlight references
  - Implement highlight merging for overlapping selections
  - Add highlight versioning for conflict resolution
  - Consider using IndexedDB for larger datasets
  - Add highlight compression for storage efficiency
- **Performance improvements:**
  - Implement highlight batching for large pages
  - Add highlight caching for frequently visited pages
  - Optimize text node traversal algorithms
  - Consider using Web Workers for heavy operations
  - Implement highlight lazy loading
- **Message passing improvements:**
  - Implement message queuing
  - Add retry mechanism
  - Improve error handling
  - Add state recovery
  - Optimize cross-frame communication
- **Initialization enhancements:**
  - Add state persistence
  - Improve cleanup
  - Add recovery mechanisms
  - Optimize memory usage
  - Add debugging tools

## Testing Notes
- Tested on static, dynamic, SPA, iframe, and shadow DOM sites
- Verified highlight visibility and persistence after reload and navigation
- Confirmed keyboard shortcut and context menu functionality
- Tested cross-device sync functionality
- Verified highlight restoration after page reload and SPA navigation
- Tested fallback restoration after DOM changes
- **Edge cases tested:**
  - Dynamic content loading (infinite scroll)
  - Iframe cross-origin restrictions
  - Shadow DOM encapsulation
  - CSP restrictions
  - Storage quota limits
  - Memory usage patterns
  - Performance under load
  - Accessibility compliance
  - Browser compatibility
  - Extension conflicts
- **Message passing tested:**
  - Cross-frame communication
  - Error handling
  - Retry mechanism
  - State synchronization
  - Performance under load
- **Initialization tested:**
  - Race conditions
  - State recovery
  - Memory leaks
  - Cleanup procedures
  - Error handling

---

*This log will be updated as development progresses.* 