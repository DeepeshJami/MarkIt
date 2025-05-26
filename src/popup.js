// Get DOM elements
const highlightsList = document.getElementById('highlightsList');
const toggleHighlightsSwitch = document.getElementById('toggleHighlightsSwitch');
const deleteAllBtn = document.getElementById('deleteAll');
const searchInput = document.getElementById('searchInput');
const pageUrlElem = document.getElementById('pageUrl');
const newHighlightBtn = document.getElementById('newHighlightBtn');

// Modal and toast elements
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const colorPicker = document.getElementById('colorPicker');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');
const syncInfo = document.getElementById('syncInfo');
const toast = document.getElementById('toast');

// Add after existing DOM element queries
const exportAllBtn = document.getElementById('exportAllBtn');
const importAllBtn = document.getElementById('importAllBtn');
const importAllInput = document.getElementById('importAllInput');

// State
let highlights = [];
let filteredHighlights = [];
let isHighlightsVisible = true;
let currentTabUrl = '';

// Utility: Check if the current page is restricted
function isRestrictedPage(url) {
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('file://') || url.includes('chrome.google.com/webstore');
}

// Utility: Normalize URL for storage key (must match contentScript.js)
function getPageKey(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

// Initialize popup
async function initializePopup() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      showError('No active tab found');
      return;
    }
    currentTabUrl = tab.url;
    pageUrlElem.textContent = getDomainAndPath(tab.url);

    // Check for restricted page
    if (isRestrictedPage(tab.url)) {
      highlightsList.innerHTML = `<div class="empty-state error">MarkIt cannot highlight this page due to browser or site restrictions.</div>`;
      return;
    }

    // Get highlights for current page from both sync and local
    const key = getPageKey(tab.url);
    const [syncData, localData] = await Promise.all([
      chrome.storage.sync.get('highlights'),
      chrome.storage.local.get('highlights')
    ]);
    const syncHighlights = (syncData.highlights?.[key] || []).map(h => ({ ...h, localOnly: false }));
    const localHighlightsRaw = localData.highlights?.[key] || [];
    // Filter out any local highlights that are already in sync (by createdAt)
    const syncIds = new Set(syncHighlights.map(h => h.createdAt));
    const localHighlights = localHighlightsRaw
      .filter(h => !syncIds.has(h.createdAt))
      .map(h => ({ ...h, localOnly: true }));
    highlights = [...syncHighlights, ...localHighlights];
    filteredHighlights = highlights;

    renderHighlights();
  } catch (error) {
    console.error('[MarkIt] Error initializing popup:', error);
    showError('Failed to load highlights');
  }
}

// Render highlights list
function renderHighlights() {
  if (filteredHighlights.length === 0) {
    highlightsList.innerHTML = `
      <div class="empty-state">
        No highlights on this page
      </div>
    `;
    return;
  }

  highlightsList.innerHTML = filteredHighlights.map((highlight, index) => `
    <div class="highlight-item" data-index="${index}" data-created-at="${highlight.createdAt}">
      <div class="highlight-color-swatch" style="background:${highlight.color || '#ffff00'}">
        <div class="highlight-color-picker-container">
          <input type="color" class="highlight-color-picker" value="${highlight.color || '#ffff00'}" />
        </div>
      </div>
      <div class="color-picker-popup">
        <input type="color" class="color-picker-input" value="${highlight.color || '#ffff00'}" />
        <button class="apply-btn">Apply Color</button>
      </div>
      <div class="highlight-content">
        <div class="highlight-date">${formatDate(highlight.createdAt)}${highlight.localOnly ? ' <span class="local-indicator" title="Only on this device">(local)</span>' : ''}</div>
        <div class="highlight-text">${highlight.text}</div>
        <div class="highlight-actions">
          <button class="jump-btn" title="Jump to highlight">Jump</button>
          <button class="delete-btn" title="Delete highlight">Delete</button>
        </div>
      </div>
    </div>
  `).join('');

  // Add event listeners
  document.querySelectorAll('.jump-btn').forEach(btn => {
    btn.addEventListener('click', handleJumpToHighlight);
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDeleteHighlight);
  });

  // Color swatch click: show color picker popup
  document.querySelectorAll('.highlight-color-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      // Close any open pickers
      document.querySelectorAll('.color-picker-popup').forEach(popup => {
        popup.classList.remove('open');
      });
      // Open this one
      const item = e.target.closest('.highlight-item');
      const popup = item.querySelector('.color-picker-popup');
      popup.classList.add('open');
    });
  });

  // Close color picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.highlight-color-swatch') && !e.target.closest('.color-picker-popup')) {
      document.querySelectorAll('.color-picker-popup').forEach(popup => {
        popup.classList.remove('open');
      });
    }
  });

  // Apply color button click
  document.querySelectorAll('.apply-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const item = e.target.closest('.highlight-item');
      const index = parseInt(item.dataset.index);
      const highlight = filteredHighlights[index];
      const colorInput = item.querySelector('.color-picker-input');
      const newColor = colorInput.value;
      
      try {
        // Update swatch color
        const swatch = item.querySelector('.highlight-color-swatch');
        swatch.style.background = newColor;
        
        // Update in highlights array
        highlight.color = newColor;
        
        // Update in storage (sync or local)
        await updateHighlightColor(highlight.createdAt, newColor, highlight.localOnly);
        
        // Update in content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'MARKIT_UPDATE_HIGHLIGHT_COLOR',
          createdAt: highlight.createdAt,
          color: newColor
        });

        if (response && response.success) {
          // Close the popup
          item.querySelector('.color-picker-popup').classList.remove('open');
          showToast('Highlight color updated');
        } else {
          throw new Error('Failed to update highlight color');
        }
      } catch (error) {
        console.error('[MarkIt] Error updating highlight color:', error);
        showToast('Failed to update highlight color', true);
        // Revert swatch color
        const swatch = item.querySelector('.highlight-color-swatch');
        swatch.style.background = highlight.color;
      }
    });
  });
}

// Update highlight color in storage
async function updateHighlightColor(createdAt, color, localOnly = false) {
  const storage = localOnly ? chrome.storage.local : chrome.storage.sync;
  const data = await storage.get('highlights');
  const allHighlights = data.highlights || {};
  const key = getPageKey(currentTabUrl);
  if (!allHighlights[key]) return;
  const idx = allHighlights[key].findIndex(h => h.createdAt === createdAt);
  if (idx !== -1) {
    allHighlights[key][idx].color = color;
    await storage.set({ highlights: allHighlights });
  }
}

// Handle jump to highlight
async function handleJumpToHighlight(event) {
  const highlightItem = event.target.closest('.highlight-item');
  const index = parseInt(highlightItem.dataset.index);
  const highlight = filteredHighlights[index];

  try {
    // Send message to content script with createdAt
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'MARKIT_JUMP_TO_HIGHLIGHT',
      createdAt: highlight.createdAt
    });
  } catch (error) {
    console.error('[MarkIt] Error jumping to highlight:', error);
    showError('Failed to jump to highlight');
  }
}

// Handle delete highlight
async function handleDeleteHighlight(event) {
  const highlightItem = event.target.closest('.highlight-item');
  const index = parseInt(highlightItem.dataset.index);
  const highlight = filteredHighlights[index];

  try {
    // Send message to content script with createdAt
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'MARKIT_REMOVE_HIGHLIGHT',
      createdAt: highlight.createdAt
    });

    // Remove from both arrays
    const origIndex = highlights.findIndex(h => h.createdAt === highlight.createdAt);
    if (origIndex !== -1) highlights.splice(origIndex, 1);
    filteredHighlights.splice(index, 1);
    renderHighlights();
  } catch (error) {
    console.error('[MarkIt] Error deleting highlight:', error);
    showError('Failed to delete highlight');
  }
}

// Handle toggle highlights visibility
async function handleToggleHighlights() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    isHighlightsVisible = toggleHighlightsSwitch.checked;
    await chrome.tabs.sendMessage(tab.id, {
      type: 'MARKIT_TOGGLE_HIGHLIGHTS',
      visible: isHighlightsVisible
    });
  } catch (error) {
    console.error('[MarkIt] Error toggling highlights:', error);
    showError('Failed to toggle highlights');
  }
}

// Handle delete all highlights
async function handleDeleteAll() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'MARKIT_REMOVE_ALL_HIGHLIGHTS'
    });
    highlights = [];
    filteredHighlights = [];
    renderHighlights();
  } catch (error) {
    console.error('[MarkIt] Error deleting all highlights:', error);
    showError('Failed to delete all highlights');
  }
}

// Handle search
function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    filteredHighlights = highlights;
  } else {
    filteredHighlights = highlights.filter(h => h.text.toLowerCase().includes(query));
  }
  renderHighlights();
}

// Handle new highlight
async function handleNewHighlight() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { type: 'MARKIT_HIGHLIGHT_SELECTION' });
    // Optionally, reload highlights after a short delay
    setTimeout(initializePopup, 400);
  } catch (error) {
    showError('Failed to create highlight');
  }
}

// Show error message
function showError(message) {
  highlightsList.innerHTML = `
    <div class="empty-state error">
      ${message}
    </div>
  `;
}

// Utility: Format date
function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Utility: Get domain and path
function getDomainAndPath(url) {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname;
  } catch {
    return url;
  }
}

// Add event listeners
toggleHighlightsSwitch.addEventListener('change', handleToggleHighlights);
deleteAllBtn.addEventListener('click', () => {
  deleteConfirmModal.style.display = 'flex';
});
cancelDeleteBtn.addEventListener('click', () => {
  deleteConfirmModal.style.display = 'none';
});
confirmDeleteBtn.addEventListener('click', async () => {
  deleteConfirmModal.style.display = 'none';
  await handleDeleteAll();
  showToast('All highlights deleted');
});
searchInput.addEventListener('input', handleSearch);
newHighlightBtn.addEventListener('click', handleNewHighlight);

// --- Settings Modal ---
settingsBtn.addEventListener('click', async () => {
  // Load color from storage
  const { markitColor } = await chrome.storage.sync.get('markitColor');
  colorPicker.value = markitColor || '#fffbe6';
  // Show sync info (dummy for now)
  syncInfo.textContent = 'Sync: Enabled';
  settingsModal.style.display = 'flex';
});
closeSettingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

// --- Color Picker ---
let colorDebounceTimer = null;
colorPicker.addEventListener('input', (e) => {
  const color = e.target.value;
  if (colorDebounceTimer) clearTimeout(colorDebounceTimer);
  colorDebounceTimer = setTimeout(async () => {
    await chrome.storage.sync.set({ markitColor: color });
    // Send message to content script to update highlight color
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'MARKIT_UPDATE_COLOR',
      color
    });
    showToast('Highlight color updated');
  }, 300);
});

// --- Export Highlights ---
exportBtn.addEventListener('click', async () => {
  const data = await chrome.storage.sync.get('highlights');
  const key = getPageKey(currentTabUrl);
  const highlights = data.highlights?.[key] || [];
  const blob = new Blob([JSON.stringify(highlights, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'markit-highlights.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Highlights exported');
});

// --- Import Highlights ---
importBtn.addEventListener('click', () => {
  importInput.click();
});
importInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported)) throw new Error('Invalid format');
    // Save to storage
    const data = await chrome.storage.sync.get('highlights');
    const allHighlights = data.highlights || {};
    const key = getPageKey(currentTabUrl);
    allHighlights[key] = imported;
    await chrome.storage.sync.set({ highlights: allHighlights });
    showToast('Highlights imported');
    initializePopup();
  } catch {
    showToast('Import failed: Invalid file', true);
  }
  importInput.value = '';
});

// --- Full Export All Highlights (Sync + Local) ---
exportAllBtn.addEventListener('click', async () => {
  try {
    const key = getPageKey(currentTabUrl);
    const [syncData, localData] = await Promise.all([
      chrome.storage.sync.get('highlights'),
      chrome.storage.local.get('highlights')
    ]);
    const syncHighlights = syncData.highlights?.[key] || [];
    const localHighlights = localData.highlights?.[key] || [];
    // Deduplicate by createdAt, prefer sync
    const all = [...syncHighlights];
    const seen = new Set(syncHighlights.map(h => h.createdAt));
    for (const h of localHighlights) {
      if (!seen.has(h.createdAt)) all.push(h);
    }
    // Format as simple, user-focused plain text
    const txt = all.map((h, i) =>
      [
        `Highlight #${i + 1}`,
        '--------------------',
        h.text.replace(/\n/g, ' '),
        `Date: ${new Date(h.createdAt).toLocaleString()}`,
        '--------------------\n'
      ].join('\n')
    ).join('\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markit-highlights.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('All highlights exported as TXT');
  } catch (e) {
    showToast('Full export failed', true);
  }
});

// --- Full Import All Highlights (Sync + Local) ---
importAllBtn.addEventListener('click', () => {
  importAllInput.click();
});
importAllInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported)) throw new Error('Invalid format');
    // Split by localOnly
    const syncHighlights = imported.filter(h => !h.localOnly);
    const localHighlights = imported.filter(h => h.localOnly);
    const key = getPageKey(currentTabUrl);
    // Merge with existing
    const [syncData, localData] = await Promise.all([
      chrome.storage.sync.get('highlights'),
      chrome.storage.local.get('highlights')
    ]);
    // Sync
    const existingSync = syncData.highlights?.[key] || [];
    const syncMap = new Map(existingSync.map(h => [h.createdAt, h]));
    for (const h of syncHighlights) syncMap.set(h.createdAt, h);
    const mergedSync = Array.from(syncMap.values());
    // Local
    const existingLocal = localData.highlights?.[key] || [];
    const localMap = new Map(existingLocal.map(h => [h.createdAt, h]));
    for (const h of localHighlights) localMap.set(h.createdAt, h);
    const mergedLocal = Array.from(localMap.values());
    // Save
    const allSync = syncData.highlights || {};
    allSync[key] = mergedSync;
    await chrome.storage.sync.set({ highlights: allSync });
    const allLocal = localData.highlights || {};
    allLocal[key] = mergedLocal;
    await chrome.storage.local.set({ highlights: allLocal });
    showToast('All highlights imported');
    initializePopup();
  } catch {
    showToast('Full import failed: Invalid file', true);
  }
  importAllInput.value = '';
});

// --- Toast/Snackbar ---
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.background = isError ? '#d32f2f' : '#222';
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 2200);
}

document.addEventListener('DOMContentLoaded', initializePopup); 