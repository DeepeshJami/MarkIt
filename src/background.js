// src/background.js
// Background service worker for MarkIt extension

// Keep track of tabs where content script is injected
const injectedTabs = new Set();
// Keep track of pending messages
const pendingMessages = new Map();

console.log('[MarkIt] Background script loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[MarkIt] Extension installed');

  // Create context menu for highlighting
  chrome.contextMenus.create({
    id: 'markit-highlight',
    title: 'Highlight with MarkIt',
    contexts: ['selection'],
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('[MarkIt] Error creating context menu:', chrome.runtime.lastError);
    } else {
      console.log('[MarkIt] Context menu created');
    }
  });
});

chrome.runtime.onStartup?.addListener(() => {
  console.log('[MarkIt] Extension started (onStartup)');
});

// Handle tab updates to ensure content script is injected
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('[MarkIt] Tab updated:', tabId, changeInfo, tab?.url);
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    console.log('[MarkIt] Tab is complete and URL is http(s), injecting content script:', tabId, tab.url);
    injectContentScript(tabId);
  }
});

async function injectContentScript(tabId) {
  console.log('[MarkIt] injectContentScript called for tab', tabId);
  if (injectedTabs.has(tabId)) {
    console.log('[MarkIt] Tab', tabId, 'already marked as injected');
    return true;
  }

  try {
    // Check if content script is already injected
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.__markitHighlights !== undefined,
    });
    console.log('[MarkIt] Injection check results for tab', tabId, results);

    if (results[0]?.result) {
      console.log('[MarkIt] Content script already present in tab', tabId);
      injectedTabs.add(tabId);
      return true;
    }

    // Inject the content script (main frame only)
    console.log('[MarkIt] Injecting contentScript.bundle.js into tab', tabId);
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['contentScript.bundle.js'],
    });
    
    injectedTabs.add(tabId);
    console.log('[MarkIt] Content script injected into tab', tabId);
    return true;
  } catch (error) {
    console.error('[MarkIt] Error injecting content script into tab', tabId, error);
    return false;
  }
}

async function sendHighlightMessage(tabId) {
  console.log('[MarkIt] sendHighlightMessage called for tab', tabId);
  // Check if there's already a pending message for this tab
  if (pendingMessages.has(tabId)) {
    console.log('[MarkIt] Message already pending for tab', tabId);
    return;
  }

  // First ensure content script is injected
  const injected = await injectContentScript(tabId);
  if (!injected) {
    console.error('[MarkIt] Failed to inject content script for tab', tabId);
    return;
  }

  // Set pending message flag
  pendingMessages.set(tabId, true);
  console.log('[MarkIt] Sending MARKIT_HIGHLIGHT_SELECTION message to tab', tabId);

  // Then send the message
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'MARKIT_HIGHLIGHT_SELECTION' });
    if (response?.success) {
      console.log('[MarkIt] Message acknowledged by content script in tab', tabId);
    } else {
      console.warn('[MarkIt] No acknowledgement from content script in tab', tabId, response);
    }
  } catch (error) {
    console.error('[MarkIt] Error sending message to tab', tabId, error);
  } finally {
    // Clear pending message flag
    pendingMessages.delete(tabId);
    console.log('[MarkIt] Cleared pending message flag for tab', tabId);
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('[MarkIt] Context menu clicked:', info, tab);
  if (info.menuItemId === 'markit-highlight' && tab?.id) {
    sendHighlightMessage(tab.id);
  } else {
    console.log('[MarkIt] Context menu click ignored:', info.menuItemId, tab?.id);
  }
});

// Handle keyboard shortcut command
chrome.commands.onCommand.addListener((command, tab) => {
  console.log('[MarkIt] Command received:', command, tab);
  if (command === 'highlight-selection' && tab?.id) {
    sendHighlightMessage(tab.id);
  } else {
    console.log('[MarkIt] Command ignored:', command, tab?.id);
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log('[MarkIt] Tab closed:', tabId);
  injectedTabs.delete(tabId);
  pendingMessages.delete(tabId);
  console.log('[MarkIt] Cleaned up state for closed tab', tabId);
});

// Listen for runtime errors
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[MarkIt] Runtime message received:', msg, sender);
  sendResponse({ received: true });
}); 