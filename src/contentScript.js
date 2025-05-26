// src/contentScript.js
// Content script that handles text selection and applies highlight spans

(function () {
  // Check if content script is already initialized
  if (window.__markitInitialized) {
    console.log('[MarkIt] Content script already initialized');
    return;
  }

  // Namespace for storing highlights on the page
  window.__markitHighlights = window.__markitHighlights || [];
  window.__markitInitialized = true;
  
  // Flag to prevent duplicate message handling
  let isProcessingMessage = false;
  // Flag to track if content script is initialized
  let isInitialized = false;
  // Debounce timer for mutation observer
  let mutationDebounceTimer = null;

  // Utility: Normalize URL for storage key
  function getPageKey(url) {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  // Storage utility functions
  async function saveHighlights(url, highlights, useLocal = false) {
    try {
      const data = useLocal
        ? await chrome.storage.local.get(null)
        : await chrome.storage.sync.get(null);
      const key = getPageKey(url);
      
      // Optimize highlight data by removing unnecessary fields
      const optimizedHighlights = highlights.map(h => ({
        text: h.text,
        startParentXPath: h.startParentXPath,
        startTextNodeIndex: h.startTextNodeIndex,
        startOffset: h.startOffset,
        endParentXPath: h.endParentXPath,
        endTextNodeIndex: h.endTextNodeIndex,
        endOffset: h.endOffset,
        createdAt: h.createdAt,
        color: h.color || '#ffff00',
        localOnly: !!useLocal
      }));

      // Split highlights into smaller chunks
      const CHUNK_SIZE = 20; // Smaller chunks to avoid quota issues
      if (optimizedHighlights.length > CHUNK_SIZE) {
        const chunks = {};
        for (let i = 0; i < optimizedHighlights.length; i += CHUNK_SIZE) {
          const chunk = optimizedHighlights.slice(i, i + CHUNK_SIZE);
          chunks[`${key}_chunk_${i/CHUNK_SIZE}`] = chunk;
        }
        // Store chunk info
        chunks[`${key}_info`] = {
          totalChunks: Math.ceil(optimizedHighlights.length / CHUNK_SIZE),
          totalHighlights: optimizedHighlights.length,
          lastUpdated: Date.now()
        };
        // Clean up old chunks before saving new ones
        await cleanupOldChunks(key, useLocal);
        if (useLocal) {
          await chrome.storage.local.set(chunks);
        } else {
          await chrome.storage.sync.set(chunks);
        }
      } else {
        const allHighlights = data.highlights || {};
        allHighlights[key] = optimizedHighlights;
        if (useLocal) {
          await chrome.storage.local.set({ highlights: allHighlights });
        } else {
          await chrome.storage.sync.set({ highlights: allHighlights });
        }
      }
      console.log(`[MarkIt] Highlights saved for ${key} (${useLocal ? 'local' : 'sync'})`, optimizedHighlights.length);
    } catch (error) {
      console.error(`[MarkIt] Error saving highlights (${useLocal ? 'local' : 'sync'}):`, error);
      if (!useLocal && error.message && error.message.includes('QUOTA_BYTES_PER_ITEM')) {
        // Fallback to local storage
        alert('MarkIt: Sync storage is full. Saving new highlights only on this device.');
        await saveHighlights(url, highlights, true);
      } else if (useLocal) {
        alert('MarkIt: Local storage is full. Please delete some highlights.');
      }
    }
  }

  // Clean up old chunks for a specific page
  async function cleanupOldChunks(currentKey, useLocal = false) {
    try {
      const data = useLocal
        ? await chrome.storage.local.get(null)
        : await chrome.storage.sync.get(null);
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      // Find and remove old chunks
      const keysToRemove = [];
      for (const key in data) {
        if (key.endsWith('_info')) {
          const info = data[key];
          if (info.lastUpdated && (now - info.lastUpdated > ONE_WEEK)) {
            // Get all chunks for this page
            const pageKey = key.replace('_info', '');
            for (const k in data) {
              if (k.startsWith(pageKey + '_chunk_')) {
                keysToRemove.push(k);
              }
            }
            keysToRemove.push(key);
          }
        }
      }
      if (keysToRemove.length > 0) {
        if (useLocal) {
          await chrome.storage.local.remove(keysToRemove);
        } else {
          await chrome.storage.sync.remove(keysToRemove);
        }
        console.log(`[MarkIt] Cleaned up old chunks (${useLocal ? 'local' : 'sync'}):`, keysToRemove.length);
      }
    } catch (error) {
      console.error(`[MarkIt] Error cleaning up old chunks (${useLocal ? 'local' : 'sync'}):`, error);
    }
  }

  // General storage cleanup
  async function cleanupStorage() {
    try {
      const now = Date.now();
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
      for (const storageType of ['sync', 'local']) {
        const data = storageType === 'local'
          ? await chrome.storage.local.get(null)
          : await chrome.storage.sync.get(null);
        // Find old highlights
        const keysToRemove = [];
        for (const key in data) {
          if (key.endsWith('_info')) {
            const info = data[key];
            if (info.lastUpdated && (now - info.lastUpdated > ONE_WEEK)) {
              const pageKey = key.replace('_info', '');
              for (const k in data) {
                if (k.startsWith(pageKey + '_chunk_')) {
                  keysToRemove.push(k);
                }
              }
              keysToRemove.push(key);
            }
          } else if (key === 'highlights') {
            // Clean up old regular highlights
            const allHighlights = data[key] || {};
            for (const pageKey in allHighlights) {
              const highlights = allHighlights[pageKey];
              if (highlights.length > 0) {
                const oldestHighlight = Math.min(...highlights.map(h => h.createdAt));
                if (now - oldestHighlight > ONE_WEEK) {
                  keysToRemove.push(key);
                  break;
                }
              }
            }
          }
        }
        if (keysToRemove.length > 0) {
          if (storageType === 'local') {
            await chrome.storage.local.remove(keysToRemove);
          } else {
            await chrome.storage.sync.remove(keysToRemove);
          }
          console.log(`[MarkIt] Cleaned up storage (${storageType}):`, keysToRemove.length, 'items removed');
        }
      }
    } catch (error) {
      console.error('[MarkIt] Error cleaning up storage:', error);
    }
  }

  // Initialize cleanup on startup
  cleanupStorage().catch(console.error);

  async function getHighlights(url) {
    try {
      const key = getPageKey(url);
      // Get both sync and local highlights
      const [syncData, localData] = await Promise.all([
        chrome.storage.sync.get(null),
        chrome.storage.local.get(null)
      ]);
      // Check if highlights are chunked (sync)
      const chunkInfo = syncData[`${key}_info`];
      let syncHighlights = [];
      if (chunkInfo) {
        for (let i = 0; i < chunkInfo.totalChunks; i++) {
          const chunk = syncData[`${key}_chunk_${i}`] || [];
          syncHighlights.push(...chunk);
        }
      } else {
        const allHighlights = syncData.highlights || {};
        syncHighlights = allHighlights[key] || [];
      }
      // Check if highlights are chunked (local)
      const localChunkInfo = localData[`${key}_info`];
      let localHighlights = [];
      if (localChunkInfo) {
        for (let i = 0; i < localChunkInfo.totalChunks; i++) {
          const chunk = localData[`${key}_chunk_${i}`] || [];
          localHighlights.push(...chunk);
        }
      } else {
        const allHighlights = localData.highlights || {};
        localHighlights = allHighlights[key] || [];
      }
      // Merge, giving priority to sync highlights (in case of duplicate createdAt)
      const all = [...syncHighlights];
      const seen = new Set(syncHighlights.map(h => h.createdAt));
      for (const h of localHighlights) {
        if (!seen.has(h.createdAt)) all.push(h);
      }
      console.log('[MarkIt] getHighlights for', key, '->', all.length, 'highlights (sync+local)');
      return all;
    } catch (error) {
      console.error('[MarkIt] Error getting highlights:', error);
      return [];
    }
  }

  async function removeHighlight(url, createdAt) {
    try {
      const key = getPageKey(url);
      const data = await chrome.storage.sync.get(null);
      
      // Check if highlights are chunked
      const chunkInfo = data[`${key}_info`];
      if (chunkInfo) {
        let found = false;
        const updates = {};
        
        // Search through chunks
        for (let i = 0; i < chunkInfo.totalChunks; i++) {
          const chunkKey = `${key}_chunk_${i}`;
          const chunk = data[chunkKey] || [];
          const newChunk = chunk.filter(h => h.createdAt !== createdAt);
          
          if (newChunk.length !== chunk.length) {
            found = true;
            updates[chunkKey] = newChunk;
          }
        }
        
        if (found) {
          // Update chunk info
          updates[`${key}_info`] = {
            totalChunks: chunkInfo.totalChunks,
            totalHighlights: chunkInfo.totalHighlights - 1
          };
          await chrome.storage.sync.set(updates);
        }
      } else {
        // Regular storage
        const allHighlights = data.highlights || {};
        const pageHighlights = allHighlights[key] || [];
        allHighlights[key] = pageHighlights.filter(h => h.createdAt !== createdAt);
        await chrome.storage.sync.set({ highlights: allHighlights });
      }
      
      console.log('[MarkIt] Highlight removed:', createdAt);
    } catch (error) {
      console.error('[MarkIt] Error removing highlight:', error);
    }
  }

  // Add a global style rule for the highlight span
  try {
    const style = document.createElement('style');
    style.textContent = '.markit-highlight, span.markit-highlight { background-color: #ffff00 !important; color: inherit !important; border-radius: 2px !important; padding: 0 2px !important; outline: 1.5px solid #ffe06633 !important; }';
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {
    // If style injection fails, fallback will be inline style on span
  }

  // Debounced function to handle mutations
  function handleMutations() {
    if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(() => {
      if (window.__markitHighlights.length > 0) {
        requestAnimationFrame(restoreHighlights);
      }
    }, 200); // 200ms debounce
  }

  // Set up MutationObserver for dynamic content
  const observer = new MutationObserver(handleMutations);

  // Start observing the document with optimized parameters
  function startObserving() {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false
    });
  }
  startObserving();

  /**
   * Build a fairly unique XPath for a given element.
   * Fallback simple algorithm – good enough for MVP restoration.
   */
  function getXPath(el) {
    if (el.id) {
      return `//*[@id="${el.id}"]`;
    }
    const parts = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = el.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === el.nodeName) {
          index += 1;
        }
        sibling = sibling.previousSibling;
      }
      parts.unshift(`${el.nodeName.toLowerCase()}[${index}]`);
      el = el.parentNode;
    }
    return '/' + parts.join('/');
  }

  /**
   * Get element from XPath
   * @param {string} xpath - The XPath to evaluate
   * @returns {Element|null} The found element or null
   */
  function getElementFromXPath(xpath) {
    try {
      return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } catch (e) {
      console.error('[MarkIt] Error evaluating XPath:', e);
      return null;
    }
  }

  // Utility to get highlight color from storage (async)
  async function getHighlightColor() {
    const { markitColor } = await chrome.storage.sync.get('markitColor');
    return markitColor || '#ffff00';
  }

  // Update all highlight elements' color
  async function updateAllHighlightColors(color) {
    const highlights = document.querySelectorAll('.markit-highlight');
    highlights.forEach(h => {
      h.style.backgroundColor = color;
    });
  }

  // Utility: Find and wrap text in a node by offset
  function wrapTextInNode(node, startOffset, endOffset, color) {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent;
    const before = text.slice(0, startOffset);
    const selected = text.slice(startOffset, endOffset);
    const after = text.slice(endOffset);
    const parent = node.parentNode;
    const frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    const span = document.createElement('span');
    span.className = 'markit-highlight';
    span.style.backgroundColor = color;
    span.textContent = selected;
    frag.appendChild(span);
    if (after) frag.appendChild(document.createTextNode(after));
    parent.replaceChild(frag, node);
  }

  // Utility: Get XPath for a node
  function getXPathForNode(node) {
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (node.id) {
      return `//*[@id="${node.id}"]`;
    }
    const parts = [];
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = node.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === node.nodeName) {
          index += 1;
        }
        sibling = sibling.previousSibling;
      }
      parts.unshift(`${node.nodeName.toLowerCase()}[${index}]`);
      node = node.parentNode;
    }
    return '/' + parts.join('/');
  }

  // Utility: Get node from XPath, searching shadow roots recursively
  function getNodeFromXPath(xpath, root = document) {
    try {
      const node = root.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (node) return node;
      // Recursively search shadow roots
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
      let current;
      while ((current = walker.nextNode())) {
        if (current.shadowRoot) {
          const shadowNode = getNodeFromXPath(xpath, current.shadowRoot);
          if (shadowNode) return shadowNode;
        }
      }
      return null;
    } catch (e) {
      console.error('[MarkIt] Error evaluating XPath:', e);
      return null;
    }
  }

  // Utility: Wrap a range in a highlight span
  function wrapRangeInHighlight(range, color) {
    const span = document.createElement('span');
    span.className = 'markit-highlight';
    span.style.backgroundColor = color;
    range.surroundContents(span);
  }

  // Utility: Get text node index within parent
  function getTextNodeIndex(node) {
    if (node.nodeType !== Node.TEXT_NODE) {
      console.warn('[MarkIt] getTextNodeIndex: node is not a text node', node);
      return -1;
    }
    let index = 0;
    let sibling = node.parentNode.firstChild;
    while (sibling && sibling !== node) {
      if (sibling.nodeType === Node.TEXT_NODE) index++;
      sibling = sibling.nextSibling;
    }
    if (index === 0 && node.parentNode && node.parentNode.childNodes.length > 1) {
      // Fallback: try to find the node among siblings
      let found = false;
      let i = 0;
      for (const sib of node.parentNode.childNodes) {
        if (sib === node) {
          found = true;
          break;
        }
        if (sib.nodeType === Node.TEXT_NODE) i++;
      }
      if (found) {
        console.warn('[MarkIt] getTextNodeIndex fallback found index', i, node);
        return i;
      }
    }
    if (index === -1) {
      console.error('[MarkIt] getTextNodeIndex: could not find node among siblings', node, node.parentNode);
    }
    return index;
  }

  // Utility: Get text node at index within parent
  function getTextNodeAtIndex(parent, index) {
    let i = 0;
    for (const node of parent.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (i === index) return node;
        i++;
      }
    }
    return null;
  }

  // Utility: Get the nearest non-highlight parent
  function getNonHighlightParent(node) {
    let parent = node.parentNode;
    while (parent && parent.classList && parent.classList.contains('markit-highlight')) {
      parent = parent.parentNode;
    }
    return parent;
  }

  // Utility: Get context snippet from a text node
  function getContextSnippet(node, start, end, contextLen = 20) {
    const text = node.textContent;
    return {
      contextBefore: text.slice(Math.max(0, start - contextLen), start),
      contextAfter: text.slice(end, end + contextLen)
    };
  }

  // Helper: Find first/last text node descendant
  function getFirstTextNode(node) {
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) return node;
    for (const child of node.childNodes) {
      const found = getFirstTextNode(child);
      if (found) return found;
    }
    return null;
  }
  function getLastTextNode(node) {
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) return node;
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const found = getLastTextNode(node.childNodes[i]);
      if (found) return found;
    }
    return null;
  }

  // Create highlight object from selection (multi-node, robust, with context)
  function getHighlightFromSelection(sel) {
    const range = sel.getRangeAt(0);
    let startNode = range.startContainer;
    let endNode = range.endContainer;
    // Fallback: if not a text node, find first/last text node descendant
    if (startNode.nodeType !== Node.TEXT_NODE) {
      const fallback = getFirstTextNode(startNode);
      console.warn('[MarkIt] getHighlightFromSelection: startContainer is not a text node, using first text node descendant', startNode, fallback);
      if (fallback) {
        startNode = fallback;
      } else {
        console.error('[MarkIt] No text node found in startContainer', startNode);
        alert('MarkIt: Could not find a text node for the start of your selection.');
        return null;
      }
    }
    if (endNode.nodeType !== Node.TEXT_NODE) {
      const fallback = getLastTextNode(endNode);
      console.warn('[MarkIt] getHighlightFromSelection: endContainer is not a text node, using last text node descendant', endNode, fallback);
      if (fallback) {
        endNode = fallback;
      } else {
        console.error('[MarkIt] No text node found in endContainer', endNode);
        alert('MarkIt: Could not find a text node for the end of your selection.');
        return null;
      }
    }
    const startParent = getNonHighlightParent(startNode);
    const endParent = getNonHighlightParent(endNode);
    const startTextNodeIndex = getTextNodeIndex(startNode);
    const endTextNodeIndex = getTextNodeIndex(endNode);
    if (startTextNodeIndex === -1 || endTextNodeIndex === -1) {
      console.error('[MarkIt] Could not determine text node index for highlight.', {
        startContainer: startNode,
        endContainer: endNode,
        startParent,
        endParent,
        range,
        selection: sel.toString(),
        dom: startParent ? startParent.innerHTML : null
      });
      alert('MarkIt: Could not determine text node index for highlight. See console for details.');
      return null;
    }
    // Context fallback
    let contextBefore = '', contextAfter = '';
    if (startNode.nodeType === Node.TEXT_NODE) {
      const ctx = getContextSnippet(startNode, range.startOffset, range.endOffset);
      contextBefore = ctx.contextBefore;
      contextAfter = ctx.contextAfter;
    }
    return {
      text: range.toString(),
      startParentXPath: getXPathForNode(startParent),
      startTextNodeIndex,
      startOffset: range.startOffset,
      endParentXPath: getXPathForNode(endParent),
      endTextNodeIndex,
      endOffset: range.endOffset,
      contextBefore,
      contextAfter,
      createdAt: Date.now(),
    };
  }

  // Utility: Walk all text nodes in a range
  function getTextNodesInRange(range) {
    const nodes = [];
    const treeWalker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Only accept nodes that are within the range
          const nodeRange = document.createRange();
          nodeRange.selectNodeContents(node);
          return (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0 &&
                  range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );
    let currentNode;
    while ((currentNode = treeWalker.nextNode())) {
      nodes.push(currentNode);
    }
    return nodes;
  }

  // Utility: Wrap part of a text node in a span
  function wrapTextNodePart(node, start, end, color, createdAt) {
    const text = node.textContent;
    const before = text.slice(0, start);
    const selected = text.slice(start, end);
    const after = text.slice(end);
    const parent = node.parentNode;
    const frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    const span = document.createElement('span');
    span.className = 'markit-highlight';
    span.setAttribute('role', 'mark');
    span.setAttribute('aria-label', 'highlight');
    if (createdAt) span.setAttribute('data-markit-id', createdAt);
    span.style.cssText = `background-color: ${color || '#ffff00'} !important; color: inherit !important; border-radius: 2px !important; padding: 0 2px !important; outline: 1.5px solid #ffe06633 !important;`;
    span.textContent = selected;
    frag.appendChild(span);
    if (after) frag.appendChild(document.createTextNode(after));
    parent.replaceChild(frag, node);
  }

  // Robustly wrap a range in highlight spans
  function robustWrapRangeInHighlight(range, color, createdAt) {
    const textNodes = getTextNodesInRange(range);
    if (textNodes.length === 0) return;
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      let start = 0;
      let end = node.textContent.length;
      if (i === 0) start = range.startOffset;
      if (i === textNodes.length - 1) end = range.endOffset;
      if (start !== end) wrapTextNodePart(node, start, end, color, createdAt);
    }
  }

  // Fallback: Find and highlight text by context snippet
  function fallbackHighlightByContext(highlight, color) {
    // Try to find the parent element by XPath, or fallback to document.body
    let parent = getNodeFromXPath(highlight.startParentXPath) || document.body;
    const text = highlight.text;
    const before = highlight.contextBefore;
    const after = highlight.contextAfter;
    // Search for the text with context in the parent's text nodes
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.textContent.indexOf(text);
      if (idx !== -1) {
        // Check context
        const beforeMatch = before ? node.textContent.slice(Math.max(0, idx - before.length), idx) === before : true;
        const afterMatch = after ? node.textContent.slice(idx + text.length, idx + text.length + after.length) === after : true;
        if (beforeMatch && afterMatch) {
          wrapTextNodePart(node, idx, idx + text.length, color, highlight.createdAt);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Restore highlights from storage
   */
  async function restoreHighlights() {
    observer.disconnect(); // Prevent loop
    const url = window.location.href;
    console.log('[MarkIt] restoreHighlights called for', url);
    const highlights = await getHighlights(url);
    window.__markitHighlights = [];
    for (const highlight of highlights) {
      const color = highlight.color || '#ffff00';
      const startParent = getNodeFromXPath(highlight.startParentXPath);
      const endParent = getNodeFromXPath(highlight.endParentXPath);
      let startNode = startParent ? getTextNodeAtIndex(startParent, highlight.startTextNodeIndex) : null;
      let endNode = endParent ? getTextNodeAtIndex(endParent, highlight.endTextNodeIndex) : null;
      // Fallback: try to find first/last text node descendant if not found
      if (!startNode && startParent) {
        startNode = getFirstTextNode(startParent);
        console.warn('[MarkIt] restoreHighlights: startNode not found by index, using first text node descendant', startParent, startNode);
      }
      if (!endNode && endParent) {
        endNode = getLastTextNode(endParent);
        console.warn('[MarkIt] restoreHighlights: endNode not found by index, using last text node descendant', endParent, endNode);
      }
      if (startNode && endNode) {
        let range = document.createRange();
        try {
          range.setStart(startNode, highlight.startOffset);
          range.setEnd(endNode, highlight.endOffset);
          robustWrapRangeInHighlight(range, color, highlight.createdAt);
          window.__markitHighlights.push(highlight);
          console.log('[MarkIt] Restored highlight:', highlight);
          continue;
        } catch (e) {
          console.warn('[MarkIt] Could not restore highlight:', highlight, e);
        }
      } else {
        // Fallback: try to find by context
        const fallback = fallbackHighlightByContext(highlight, color);
        if (fallback) {
          window.__markitHighlights.push(highlight);
          console.log('[MarkIt] Restored highlight by context:', highlight);
        } else {
          console.warn('[MarkIt] Could not find parent element or text node for highlight:', highlight);
        }
      }
    }
    console.log('[MarkIt] restoreHighlights done. Total:', window.__markitHighlights.length);
    startObserving(); // Reconnect observer
  }

  // Utility: Check if node is inside an input, textarea, or contenteditable
  function isInEditor(node) {
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || node.isContentEditable) {
          return true;
        }
      }
      node = node.parentNode;
    }
    return false;
  }

  /**
   * Wrap current selection in a <span class="markit-highlight">.
   * Stores anchor information in window.__markitHighlights and chrome.storage.sync.
   */
  async function highlightSelection() {
    if (isProcessingMessage) return;
    isProcessingMessage = true;
    try {
    console.log('[MarkIt] highlightSelection triggered');
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      console.log('[MarkIt] Nothing selected');
        return;
    }
      // Check if selection is inside an editor or input
    const range = sel.getRangeAt(0);
      if (isInEditor(range.startContainer) || isInEditor(range.endContainer)) {
        alert('MarkIt: Highlighting inside editors, inputs, or textareas is not supported.');
        return;
      }
      // Capture selection and XPaths BEFORE modifying DOM
      const highlight = getHighlightFromSelection(sel);
      if (!highlight) return;
      // Get current color
      const color = await getHighlightColor();
      highlight.color = color;
      console.log('[MarkIt] Storing highlight:', highlight);
      // Fetch latest highlights from storage
      const url = window.location.href;
      let highlights = await getHighlights(url);
      highlights.push(highlight);
      window.__markitHighlights = highlights;
      await saveHighlights(url, highlights);
      // Now robustly wrap the range in the DOM, passing createdAt and color
      robustWrapRangeInHighlight(range.cloneRange(), color, highlight.createdAt);
      sel.removeAllRanges();
      console.log('[MarkIt] Highlight added', highlight.text);
    } catch (error) {
      console.error('[MarkIt] Error applying highlight:', error);
    } finally {
      isProcessingMessage = false;
    }
  }

  // Initialize the content script
  async function initialize() {
    if (isInitialized) {
      return;
    }
    try {
      console.log('[MarkIt] Initializing content script...');
      await restoreHighlights();
      isInitialized = true;
      console.log('[MarkIt] Content script initialized');
    } catch (error) {
      console.error('[MarkIt] Error initializing content script:', error);
    }
  }

  // Listen for messages from background / popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'MARKIT_HIGHLIGHT_SELECTION') {
      console.log('[MarkIt] Message received: MARKIT_HIGHLIGHT_SELECTION');
      highlightSelection().then(() => {
        sendResponse({ success: true });
      });
    } else if (request.type === 'MARKIT_REMOVE_HIGHLIGHT') {
      console.log('[MarkIt] Message received: MARKIT_REMOVE_HIGHLIGHT', request);
      // Remove by createdAt
      const url = window.location.href;
      getHighlights(url).then(highlights => {
        const idx = highlights.findIndex(h => h.createdAt === request.createdAt);
        if (idx !== -1) {
          // Remove highlight span from DOM by data-markit-id
          const highlight = highlights[idx];
          const spans = document.querySelectorAll(`.markit-highlight[data-markit-id='${highlight.createdAt}']`);
          spans.forEach(span => {
            const textNode = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(textNode, span);
          });
          highlights.splice(idx, 1);
          window.__markitHighlights = highlights;
          saveHighlights(url, highlights).then(() => {
            sendResponse({ success: true });
          });
        } else {
          sendResponse({ success: false, error: 'Highlight not found' });
        }
      });
    } else if (request.type === 'MARKIT_JUMP_TO_HIGHLIGHT') {
      console.log('[MarkIt] Message received: MARKIT_JUMP_TO_HIGHLIGHT', request);
      // Find highlight by createdAt
      getHighlights(window.location.href).then(async highlights => {
        const highlight = highlights.find(h => h.createdAt === request.createdAt);
        if (highlight) {
          // Try to find the highlight span by data-markit-id
          let span = document.querySelector(`.markit-highlight[data-markit-id='${highlight.createdAt}']`);
          if (!span) {
            console.warn('[MarkIt] Jump: span not found, attempting to restore highlights and retry...');
            await restoreHighlights();
            span = document.querySelector(`.markit-highlight[data-markit-id='${highlight.createdAt}']`);
          }
          if (span) {
            span.scrollIntoView({ behavior: 'smooth', block: 'center' });
            span.style.transition = 'background-color 0.3s';
            const originalBackground = span.style.backgroundColor;
            span.style.backgroundColor = '#fff3cd';
            setTimeout(() => {
              span.style.backgroundColor = originalBackground;
            }, 1000);
            sendResponse({ success: true });
            return;
          } else {
            console.error('[MarkIt] Jump failed: Highlight span not found after restore', highlight);
            sendResponse({ success: false, error: 'Highlight not found on page. It may have moved or been deleted.' });
          }
        } else {
          sendResponse({ success: false, error: 'Highlight not found' });
        }
      });
    } else if (request.type === 'MARKIT_TOGGLE_HIGHLIGHTS') {
      console.log('[MarkIt] Message received: MARKIT_TOGGLE_HIGHLIGHTS');
      const highlights = document.querySelectorAll('.markit-highlight');
      highlights.forEach(highlight => {
        highlight.style.display = request.visible ? 'inline' : 'none';
      });
      sendResponse({ success: true });
    } else if (request.type === 'MARKIT_REMOVE_ALL_HIGHLIGHTS') {
      console.log('[MarkIt] Message received: MARKIT_REMOVE_ALL_HIGHLIGHTS');
      const highlights = document.querySelectorAll('.markit-highlight');
      highlights.forEach(highlight => {
        const textNode = document.createTextNode(highlight.textContent);
        highlight.parentNode.replaceChild(textNode, highlight);
      });
      window.__markitHighlights = [];
      saveHighlights(window.location.href, []).then(() => {
        sendResponse({ success: true });
      });
    } else if (request.type === 'MARKIT_UPDATE_COLOR') {
      updateAllHighlightColors(request.color);
      sendResponse({ success: true });
    } else if (request.type === 'MARKIT_UPDATE_HIGHLIGHT_COLOR') {
      // Update the color of the span with the given createdAt
      const { createdAt, color } = request;
      const spans = document.querySelectorAll(`.markit-highlight[data-markit-id='${createdAt}']`);
      if (spans.length > 0) {
        spans.forEach(span => {
          // Update both background and outline color
          span.style.cssText = `
            background-color: ${color} !important;
            color: inherit !important;
            border-radius: 2px !important;
            padding: 0 2px !important;
            outline: 1.5px solid ${color}33 !important;
          `;
        });
        // Also update in storage
        getHighlights(window.location.href).then(highlights => {
          const idx = highlights.findIndex(h => h.createdAt === createdAt);
          if (idx !== -1) {
            highlights[idx].color = color;
            window.__markitHighlights = highlights;
            saveHighlights(window.location.href, highlights).then(() => {
              sendResponse({ success: true });
            });
          } else {
            sendResponse({ success: false, error: 'Highlight not found' });
          }
        });
      } else {
        sendResponse({ success: false, error: 'Highlight span not found' });
      }
      return true;
    }
    // Return true to indicate we will send a response asynchronously
    return true;
  });

  // Initialize when the page is ready using passive event listener
  const initHandler = () => {
    initialize();
    // Remove the listener after initialization
    document.removeEventListener('DOMContentLoaded', initHandler);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHandler, { passive: true });
  } else {
    initialize();
  }

  // Re-apply highlights on SPA navigation or hash changes
  window.addEventListener('popstate', () => {
    console.log('[MarkIt] SPA navigation detected (popstate). Restoring highlights...');
    restoreHighlights();
  });
  window.addEventListener('hashchange', () => {
    console.log('[MarkIt] Hash change detected. Restoring highlights...');
    restoreHighlights();
  });
})(); 