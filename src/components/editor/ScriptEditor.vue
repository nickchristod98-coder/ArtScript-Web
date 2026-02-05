<!-- SimplifiedScriptEditor.vue -->
<template>
  <div class="editor-container" ref="containerRef" :class="{ 'full-page-view': store.fullPageView, 'has-mobile-force-bar': props.isMobile }" @click="handleContainerClick">
    <div class="editor-wrapper">
      <div
        class="script-editor"
        :class="{ 'book-format': isBookFormat }"
        contenteditable="true"
        ref="editorRootRef"
        @click="handleEditorClick"
        @input="handleEditorInput"
        @keydown="handleEditorKeyDown"
        @paste="handlePaste"
        @focusin="handleEditorFocusIn"
        :spellcheck="store.spellCheckEnabled"
        :lang="store.spellGrammarLanguage ? store.spellGrammarLanguage.split('-')[0] : 'en'"
      >
        <!-- Single contenteditable: all lines in one region for cross-line selection. v-memo avoids re-render during selection (no top-level state change). -->
        <div v-for="(line, index) in lines" :key="line.id" :data-line-index="index" v-memo="[line.id, line.type, index]">
          <!-- Page break indicator -->
          <div v-if="pageBreaks.has(index) && index > 0" class="page-break-indicator">
            <span class="page-break-line"></span>
          </div>

          <div :class="['script-line', 'block-element', `line-${line.type}`]" :data-line-id="line.id">
            <span v-if="line.type === 'scene-heading' && !isBookFormat" class="scene-number" contenteditable="false">
              {{ getSceneNumber(index) }}
            </span>
            <div
              :ref="(el) => setLineRef(el, index)"
              class="line-content block-element"
              :data-line-id="line.id"
              contenteditable="true"
              @mousedown="handleMouseDown($event, index)"
              @mouseup="handleMouseUp($event, index)"
              @mouseleave="handleMouseLeave($event, index)"
              @contextmenu="handleContextMenu($event, line.id)"
            ></div>
          </div>
        </div>
    </div>
    <!-- Mobile: Fixed toolbar - follows keyboard via Visual Viewport API -->
    <div v-if="props.isMobile" class="mobile-toolbar" :style="mobileToolbarStyle">
      <button class="force-btn force-btn-square" @click="forceLineTypeWithFocus('scene-heading', 'INT. ')" title="INT. (scene heading)">
        INT.
      </button>
      <button class="force-btn force-btn-square" @click="forceLineTypeWithFocus('scene-heading', 'EXT. ')" title="EXT. (scene heading)">
        EXT.
      </button>
      <button class="force-btn" @click="forceLineTypeWithFocus('character')" title="Force Character">
        CHAR.
      </button>
      <button class="force-btn" @click="forceLineTypeWithFocus('dialogue')" title="Force Dialogue">
        Dialogue
      </button>
    </div>
  </div>

    <!-- Annotation underlines overlay (clickable, shows note) -->
    <div class="annotation-underlines-layer" aria-hidden="true">
      <div
        v-for="rect in annotationRects"
        :key="rect.id"
        class="annotation-underline"
        :style="{
          left: rect.left + 'px',
          top: rect.top + 'px',
          width: rect.width + 'px',
          height: rect.height + 'px',
        }"
        @click.stop="showFloatingNote(rect)"
      ></div>
    </div>

    <!-- Floating note card (shown when user clicks underlined text) -->
    <div
      v-if="floatingNote"
      class="floating-note-card"
      :style="{ left: floatingNote.x + 'px', top: floatingNote.y + 'px' }"
      @click.stop
    >
      <div class="floating-note-anchor">"{{ floatingNote.anchorText.length > 50 ? floatingNote.anchorText.slice(0, 50) + '…' : floatingNote.anchorText }}"</div>
      <div class="floating-note-content">{{ floatingNote.noteContent || '—' }}</div>
      <div class="floating-note-actions">
        <button class="floating-note-close" @click="closeFloatingNote">Close</button>
        <button class="floating-note-delete" @click="deleteFloatingNote">Delete</button>
      </div>
    </div>

    <!-- Context menu for +Note -->
    <div
      v-if="contextMenu.visible"
      class="annotation-context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <button class="context-menu-item" @click="openNotePopover">
        <i class="pi pi-plus"></i> Note
      </button>
    </div>

    <!-- Note popover -->
    <div
      v-if="notePopover.visible"
      class="annotation-note-popover"
      :style="{ left: notePopover.x + 'px', top: notePopover.y + 'px' }"
      @click.stop
    >
      <div class="note-popover-header">Add note</div>
      <textarea
        ref="notePopoverTextarea"
        v-model="notePopoverContent"
        class="note-popover-textarea"
        placeholder="Your note..."
        rows="4"
      ></textarea>
      <div class="note-popover-actions">
        <button class="note-popover-btn cancel" @click="closeNotePopover">Cancel</button>
        <button class="note-popover-btn save" @click="saveNote">Save</button>
      </div>
    </div>

    <!-- Debug info (optional) -->
    <div v-if="showDebug" class="debug-panel">
      <div>Lines: {{ lines.length }}</div>
      <div>Current: {{ currentLineIndex }}</div>
      <div>Type: {{ currentLineType }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps({
  showDebug: {
    type: Boolean,
    default: false,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
})

const store = useProjectStore()
const containerRef = ref(null)
const editorRootRef = ref(null)
const lineRefs = ref([])
const currentLineIndex = ref(0)
const ignoreNextUpdate = ref(false)
const pageBreaks = ref(new Set()) // Track which lines start new pages
const isExternalUpdate = ref(false) // Track if update is from undo/redo
const isSelecting = ref(false) // Track if user is selecting across lines
const selectionStart = ref({ lineIndex: null, offset: null }) // Track selection start
const inputDrivenUpdate = ref(false) // Prevent setLineRef overwrite when syncing from input

// Global cursor position tracker: restored after any re-render/DOM overwrite (e.g. setLineRef, watchers)
const pendingCursorRestore = ref(null) // { index, startOffset, endOffset } or null
// When true, do not restore cursor (e.g. after Enter so browser/default logic moves to new line)
const skipNextCursorRestore = ref(false)

// Annotation (inline note) state
const contextMenu = ref({ visible: false, x: 0, y: 0 })
const notePopover = ref({ visible: false, x: 0, y: 0, content: '' })
const notePopoverContent = ref('')
const pendingAnnotation = ref({ lineId: null, anchorText: '' })
const notePopoverTextarea = ref(null)
const annotationRects = ref([]) // { id, left, top, width, height, annotation }
const floatingNote = ref(null) // { x, y, anchorText, noteContent, id } when showing floating card

// Visual Viewport: toolbar bottom offset (follows keyboard)
const toolbarBottomOffset = ref(0)
const mobileToolbarStyle = computed(() => ({
  bottom: toolbarBottomOffset.value + 'px',
}))
const updateToolbarBottomOffset = () => {
  if (typeof window !== 'undefined' && window.visualViewport) {
    toolbarBottomOffset.value = Math.max(0, window.innerHeight - window.visualViewport.height)
  }
}

// Computed properties
const isBookFormat = computed(() => store.activeProject?.format === 'Book')
const lines = computed(() => store.activeProject?.lines || [])
const currentLineType = computed(() => lines.value[currentLineIndex.value]?.type || 'action')

// Annotations for current script (line exists in current lines)
const currentAnnotations = computed(() => {
  const project = store.activeProject
  if (!project || !project.annotations || !project.lines) return []
  const lineIds = new Set(project.lines.map((l) => l.id))
  return project.annotations.filter((a) => lineIds.has(a.lineId))
})

// Set line ref and initialize content
const setLineRef = (el, index) => {
  if (!el) return

  lineRefs.value[index] = el
  const line = lines.value[index]
  
  // Always initialize content when ref is set (important for Book format)
  if (line) {
    const content = line.content || ''
    const currentText = (el.innerText || el.textContent || '').replace(/\u200B/g, '')
    const shouldSync = isExternalUpdate.value || !currentText || (currentText !== content && !inputDrivenUpdate.value)
    if (shouldSync && currentText !== content) {
      const captured = captureCursorPosition()
      if (captured && captured.index === index) {
        pendingCursorRestore.value = { index: captured.index, startOffset: captured.startOffset, endOffset: captured.endOffset }
      }
      el.innerText = content || (el.childNodes.length ? '' : '\u200B')
      nextTick(restorePendingCursor)
    }
    if (!content && !el.firstChild) {
      el.appendChild(document.createTextNode('\u200B'))
    }
  }
}

// Get scene number for a line
const getSceneNumber = (index) => {
  let count = 0
  for (let i = 0; i <= index; i++) {
    if (lines.value[i]?.type === 'scene-heading') {
      count++
    }
  }
  return count
}

// Get page number for a line
const getPageNumber = (index) => {
  let pageNum = 1
  for (let i = 0; i < index; i++) {
    if (pageBreaks.value.has(i)) {
      pageNum++
    }
  }
  return pageNum
}

// Calculate page breaks
const calculatePageBreaks = () => {
  // For Book format, add page breaks before chapters
  if (isBookFormat.value) {
    const newPageBreaks = new Set()
    lines.value.forEach((line, index) => {
      if (line.type === 'chapter-title' && index > 0) {
        newPageBreaks.add(index)
      }
    })
    pageBreaks.value = newPageBreaks
    return
  }

  nextTick(() => {
    if (!lineRefs.value.length) return

    const PAGE_HEIGHT = 1123 // A4 height in px at 96 DPI
    const TOP_MARGIN = 72 // 1 inch
    const BOTTOM_MARGIN = 72
    const USABLE_HEIGHT = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN

    let currentPage = 1
    let currentPageHeight = TOP_MARGIN
    const newPageBreaks = new Set()

    lines.value.forEach((line, index) => {
      const lineElement = lineRefs.value[index]?.closest('.script-line')
      if (!lineElement) return

      // Get line height including margins
      const computedStyle = window.getComputedStyle(lineElement)
      const marginTop = parseFloat(computedStyle.marginTop) || 0
      const marginBottom = parseFloat(computedStyle.marginBottom) || 0
      const lineHeight = lineElement.offsetHeight + marginTop + marginBottom

      // Check if this line would overflow the page
      if (currentPageHeight + lineHeight > PAGE_HEIGHT - BOTTOM_MARGIN) {
        // Mark this line as starting a new page
        newPageBreaks.add(index)
        currentPage++
        currentPageHeight = TOP_MARGIN + lineHeight
      } else {
        currentPageHeight += lineHeight
      }
    })

    pageBreaks.value = newPageBreaks
  })
}

// Single contenteditable: sync DOM to store on input (walk all lines)
const handleEditorInput = () => {
  inputDrivenUpdate.value = true
  nextTick(() => { inputDrivenUpdate.value = false })

  const root = editorRootRef.value
  if (!root) return

  const lineDivs = root.querySelectorAll('.script-line')
  lineDivs.forEach((scriptLine) => {
    const contentEl = scriptLine.querySelector('.line-content')
    const lineId = scriptLine.getAttribute('data-line-id')
    const idxAttr = scriptLine.closest('[data-line-index]')?.getAttribute('data-line-index')
    const index = idxAttr != null ? parseInt(idxAttr, 10) : lines.value.findIndex((l) => l.id === lineId)
    if (!contentEl || !lineId || index < 0) return

    const line = lines.value.find((l) => l.id === lineId)
    if (!line) return

    const newContent = (contentEl.innerText || contentEl.textContent || '').replace(/\u200B/g, '')
    if (newContent === line.content) return

    handleLineContentUpdate(lineId, index, newContent, contentEl)
  })
}

// Shared logic for line content updates (from editor input)
const handleLineContentUpdate = (lineId, index, newContent, targetElement) => {
  const line = lines.value.find((l) => l.id === lineId)
  if (!line) return

  let savedCursor = null
  const sel = window.getSelection()
  if (sel && sel.rangeCount && targetElement) {
    const range = sel.getRangeAt(0)
    if (targetElement.contains(range.startContainer)) {
      const preRange = range.cloneRange()
      preRange.selectNodeContents(targetElement)
      preRange.setEnd(range.startContainer, range.startOffset)
      const startOffset = preRange.toString().length
      preRange.setEnd(range.endContainer, range.endOffset)
      const endOffset = preRange.toString().length
      savedCursor = { index, startOffset, endOffset }
    }
  }

  const previousContent = line.content
  const previousType = line.type
  line.content = newContent

  const convertedToSceneHeading = autoDetectType(lineId, newContent)

  if (line.type === 'character') {
    updateContdStatus(lineId, index)
    const updatedContent = line.content
    if (updatedContent !== newContent && targetElement && targetElement.innerText !== updatedContent) {
      targetElement.innerText = updatedContent
      nextTick(() => {
        const selection = window.getSelection()
        if (selection.rangeCount) {
          const range = selection.getRangeAt(0)
          const textNode = targetElement.firstChild
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const cursorPos = Math.min(range.startOffset, updatedContent.length)
            range.setStart(textNode, cursorPos)
            range.collapse(true)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })
    }
    if (previousContent !== newContent || previousType !== line.type) {
      updateContdBelow(index)
    }
  }

  if (convertedToSceneHeading && savedCursor) {
    nextTick(() => {
      if (skipNextCursorRestore.value) {
        skipNextCursorRestore.value = false
        return
      }
      const el = lineRefs.value[savedCursor.index]
      if (el) {
        restoreCursorInElement(el, savedCursor.startOffset, savedCursor.endOffset)
      }
    })
  }

  debouncePageBreaks()
}

// Debounced page break calculation
let pageBreakTimeout = null
const debouncePageBreaks = () => {
  if (pageBreakTimeout) clearTimeout(pageBreakTimeout)
  pageBreakTimeout = setTimeout(() => {
    calculatePageBreaks()
  }, 500)
}

// Strip (CONT'D) from character name for comparison
const stripContd = (text) => {
  return text.replace(/\s*\(CONT'D\)\s*$/i, '').trim()
}

// Find the last character block before the given index (skipping parenthetical and dialogue)
const findLastCharacter = (currentIndex) => {
  for (let i = currentIndex - 1; i >= 0; i--) {
    const line = lines.value[i]
    if (!line) continue
    
    // Stop at scene heading (scene break)
    if (line.type === 'scene-heading') {
      return null
    }
    
    // Found a character block
    if (line.type === 'character') {
      return { line, index: i }
    }
    
    // Skip parenthetical and dialogue, continue searching
    if (line.type === 'parenthetical' || line.type === 'dialogue') {
      continue
    }
    
    // If we hit action or other types, stop searching
    break
  }
  return null
}

// Check and update (CONT'D) status for a character line
const updateContdStatus = (lineId, lineIndex) => {
  const line = lines.value.find((l) => l.id === lineId)
  if (!line || line.type !== 'character') return
  
  const lastChar = findLastCharacter(lineIndex)
  if (!lastChar) {
    // No previous character found, remove (CONT'D) if present
    const currentContent = line.content.trim()
    const stripped = stripContd(currentContent)
    if (currentContent !== stripped) {
      line.content = stripped
    }
    return
  }
  
  const currentName = stripContd(line.content.trim())
  const lastCharName = stripContd(lastChar.line.content.trim())
  
  // Compare names (case-insensitive)
  if (currentName.toUpperCase() === lastCharName.toUpperCase() && currentName.length > 0) {
    // Names match - add (CONT'D) if not present
    if (!line.content.toUpperCase().includes("(CONT'D)")) {
      line.content = `${currentName} (CONT'D)`
    }
  } else {
    // Names don't match - remove (CONT'D) if present
    const stripped = stripContd(line.content.trim())
    if (line.content.trim() !== stripped) {
      line.content = stripped
    }
  }
}

// Update all character lines below a changed line
const updateContdBelow = (changedIndex) => {
  nextTick(() => {
    for (let i = changedIndex + 1; i < lines.value.length; i++) {
      const line = lines.value[i]
      if (line.type === 'character') {
        updateContdStatus(line.id, i)
      }
      // Stop at next scene heading
      if (line.type === 'scene-heading') {
        break
      }
    }
  })
}

// First line of script: force scene heading when content starts with int./ext./εσω./εξω./έσω./έξω. (any case).
// Use explicit lower/startsWith for "int." and "ext." to avoid locale issues (e.g. Turkish toUpperCase).
function isSceneHeadingStart(trimmed) {
  const lower = trimmed.toLowerCase()
  return (
    lower.startsWith('int.') ||
    lower.startsWith('ext.') ||
    trimmed.startsWith('εσω.') ||
    trimmed.startsWith('εξω.') ||
    trimmed.startsWith('ΕΣΩ.') ||
    trimmed.startsWith('ΕΞΩ.') ||
    trimmed.startsWith('έσω.') ||
    trimmed.startsWith('έξω.') ||
    trimmed.startsWith('Έσω.') ||
    trimmed.startsWith('Έξω.')
  )
}

// When scene heading starts with έσω./έξω. (or Έσω./Έξω.), normalize to ΕΣΩ./ΕΞΩ. and update line content.
function normalizeGreekSceneHeadingPrefix(lineId, content) {
  const trimmed = content.trim()
  let normalizedTrimmed = trimmed
  if (trimmed.startsWith('έσω.') || trimmed.startsWith('Έσω.')) {
    normalizedTrimmed = 'ΕΣΩ.' + trimmed.slice(4)
  } else if (trimmed.startsWith('έξω.') || trimmed.startsWith('Έξω.')) {
    normalizedTrimmed = 'ΕΞΩ.' + trimmed.slice(4)
  }
  if (normalizedTrimmed === trimmed) return
  const start = content.indexOf(trimmed)
  if (start === -1) return
  const newContent = content.slice(0, start) + normalizedTrimmed
  store.updateLine(lineId, newContent)
}

// Auto-detect line type based on content. Returns true if line was converted to scene-heading.
const autoDetectType = (lineId, content) => {
  // Disable auto-detection for Book format (Word-like behavior)
  if (isBookFormat.value) return false

  // Strip zero-width space (first line may have it for focusability) so "int."/ "ext." etc. are detected
  const trimmed = content.replace(/\u200B/g, '').trim()
  const upper = trimmed.toUpperCase()
  const lower = trimmed.toLowerCase()

  const line = lines.value.find((l) => l.id === lineId)
  if (!line) return false
  
  const previousType = line.type
  const lineIndex = lines.value.findIndex((l) => l.id === lineId)

  // First line of script: force scene heading when it starts with int./ext./εσω./εξω./έσω./έξω.
  if (lineIndex === 0 && isSceneHeadingStart(trimmed)) {
    if (line.type !== 'scene-heading') {
      line.type = 'scene-heading'
      updateContdBelow(lineIndex)
      store.selectedSceneId = null
      normalizeGreekSceneHeadingPrefix(lineId, content)
      return true
    }
    normalizeGreekSceneHeadingPrefix(lineId, content)
    return false
  }

  // Detect notes (check first - lines starting with "//")
  if (trimmed.startsWith('//')) {
    if (line.type !== 'note') {
      line.type = 'note'
    }
    return false
  }

  // Detect transitions (check first, as they might contain "FADE IN:")
  // Check both uppercase and lowercase
  if (upper.startsWith('FADE IN:') || lower.startsWith('fade in:') ||
      upper.startsWith('FADE OUT:') || lower.startsWith('fade out:') ||
      upper === 'FADE IN' || lower === 'fade in' ||
      upper === 'FADE OUT' || lower === 'fade out' ||
      upper.startsWith('CUT TO:') || lower.startsWith('cut to:') ||
      upper.startsWith('CUT TO BLACK:') || lower.startsWith('cut to black:') ||
      upper === 'CUT TO' || lower === 'cut to' ||
      upper.startsWith('DISSOLVE TO:') || lower.startsWith('dissolve to:') ||
      upper === 'DISSOLVE TO' || lower === 'dissolve to' ||
      upper.startsWith('SMASH CUT TO:') || lower.startsWith('smash cut to:') ||
      upper === 'SMASH CUT TO' || lower === 'smash cut to') {
    if (line.type !== 'transition') {
      line.type = 'transition'
      // Keep cursor at end of line after transition detection
      nextTick(() => {
        const lineElement = lineRefs.value[lineIndex]
        if (lineElement) {
          moveCursorToEnd(lineElement)
        }
      })
    }
    return false
  }

  // Detect scene headings (English and Greek) – use isSceneHeadingStart so lowercase "int."/ "ext." always match
  if (isSceneHeadingStart(trimmed)) {
    if (line.type !== 'scene-heading') {
      line.type = 'scene-heading'
      // Scene break - update (CONT'D) status for characters below
      updateContdBelow(lineIndex)
      // Reset selected scene to highlight last scene
      store.selectedSceneId = null
      normalizeGreekSceneHeadingPrefix(lineId, content)
      return true
    }
    normalizeGreekSceneHeadingPrefix(lineId, content)
    return false
  }
  
  // If type changed to character, update (CONT'D) status
  if (line.type === 'character' && previousType !== 'character') {
    updateContdStatus(lineId, lineIndex)
  }
  return false
}

// Get current line index from selection (for single contenteditable)
// data-line-index is on the parent of .script-line, not on .script-line itself
const getCurrentLineFromSelection = () => {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  let node = range.startContainer
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
  const scriptLine = node?.closest?.('.script-line')
  if (!scriptLine) return null
  const lineIndexEl = scriptLine.closest?.('[data-line-index]')
  const idx = lineIndexEl != null ? parseInt(lineIndexEl.getAttribute('data-line-index'), 10) : NaN
  if (isNaN(idx) || idx < 0) return null
  const line = lines.value[idx]
  return line ? { line, index: idx } : null
}

// True if current selection is inside the editor (a .line-content under .script-editor)
const isSelectionInEditor = () => {
  const root = editorRootRef.value
  if (!root) return false
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return false
  const range = sel.getRangeAt(0)
  let node = range.startContainer
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
  const lineContent = node?.closest?.('.line-content')
  return lineContent != null && root.contains(lineContent)
}

// Put cursor into the nearest focusable line (e.g. after Backspace removes nodes and selection is lost)
const restoreCursorToNearestLine = () => {
  const root = editorRootRef.value
  if (!root) return
  const refs = lineRefs.value
  const idx = Math.min(Math.max(0, currentLineIndex.value), refs.length - 1)
  let el = refs[idx]
  if (!el || !root.contains(el)) {
    for (let i = 0; i < refs.length; i++) {
      if (refs[i] && root.contains(refs[i])) {
        el = refs[i]
        currentLineIndex.value = i
        break
      }
    }
  }
  if (!el) {
    const first = root.querySelector('.line-content')
    if (first) el = first
  }
  if (!el) return
  if (!el.firstChild) {
    el.appendChild(document.createTextNode('\u200B'))
  }
  el.focus()
  const range = document.createRange()
  const sel = window.getSelection()
  range.selectNodeContents(el)
  range.collapse(true)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

// Single contenteditable: delegate keydown to line handler
const handleEditorKeyDown = (event) => {
  const curr = getCurrentLineFromSelection()
  if (curr) {
    currentLineIndex.value = curr.index
    handleKeyDown(event, curr.line, curr.index)
  } else {
    handleKeyDown(event, lines.value[0], 0)
  }

  // Backspace: after browser deletes, ensure selection stays in editor; restore if lost (e.g. when holding Backspace)
  if (event.key === 'Backspace') {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (editorRootRef.value && !isSelectionInEditor()) {
          restoreCursorToNearestLine()
        }
      })
    })
  }
}

// Single contenteditable: update currentLineIndex on focus (only on mouseUp, not during drag)
const handleEditorFocusIn = () => {
  if (isSelecting.value) return // disable block-index updates while mouse is down (prevents jitter)
  if (window.getSelection().toString()) return // don't update when user has a selection (avoids re-render/focus stealing)
  const curr = getCurrentLineFromSelection()
  if (curr) currentLineIndex.value = curr.index
}

// Handle keyboard events
const handleKeyDown = (event, line, index) => {
  // With single contenteditable, event.target is the root; use line ref for the current line
  const currentElement = lineRefs.value[index] ?? event.target

  // Check for force shortcuts first (CTRL+1-5)
  if (event.ctrlKey && !event.metaKey && ['1', '2', '3', '4', '5'].includes(event.key)) {
    event.preventDefault()
    const keyMap = {
      '1': 'scene-heading',
      '2': 'action',
      '3': 'character',
      '4': 'dialogue',
      '5': 'transition'
    }
    const type = keyMap[event.key]
    if (type) {
      store.pushToHistory()
      store.updateLine(line.id, line.content, type)
    }
    return
  }

  // Enter key - never let the browser handle it; always split line at cursor and create new block
  if (event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    skipNextCursorRestore.value = true

    // Resolve current line element (must be the .line-content for this line)
    const lineEl = lineRefs.value[index]
    const currentElement = lineEl || (event.target.classList?.contains('line-content') ? event.target : null)
    if (!currentElement) return

    const currentText = (currentElement.innerText || currentElement.textContent || '').replace(/\u200B/g, '')
    let cursorPosition = 0

    const selection = window.getSelection()
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0)
      try {
        // Cursor position: from start of this line's content to selection start
        const preRange = document.createRange()
        preRange.selectNodeContents(currentElement)
        if (currentElement.contains(range.startContainer)) {
          preRange.setEnd(range.startContainer, range.startOffset)
          cursorPosition = preRange.toString().length
        } else {
          cursorPosition = currentText.length
        }
      } catch (_) {
        cursorPosition = currentText.length
      }
    } else {
      cursorPosition = currentText.length
    }
    cursorPosition = Math.max(0, Math.min(cursorPosition, currentText.length))

    // Cursor at start of first line and line empty: insert empty line at start
    if (index === 0 && cursorPosition === 0 && currentText.length === 0) {
      store.pushToHistory()
      const emptyLine = { id: uuidv4(), type: 'action', content: '' }
      store.activeProject.lines.unshift(emptyLine)
      store.activeProject.updatedAt = Date.now()
      nextTick(() => {
        nextTick(() => {
          const firstElement = lineRefs.value[0]
          if (firstElement) {
            firstElement.contentEditable = 'true'
            firstElement.focus()
            placeCursorAtEnd(firstElement)
          }
        })
      })
      return
    }

    // Scene heading, cursor at start: insert empty line above
    if (line.type === 'scene-heading' && cursorPosition === 0) {
      store.pushToHistory()
      const emptyLine = { id: uuidv4(), type: 'action', content: '' }
      store.activeProject.lines.splice(index, 0, emptyLine)
      store.activeProject.updatedAt = Date.now()
      updateContdBelow(index)
      nextTick(() => {
        nextTick(() => {
          const newElement = lineRefs.value[index]
          if (newElement) {
            newElement.contentEditable = 'true'
            newElement.focus()
            placeCursorAtEnd(newElement)
          }
        })
      })
      return
    }

    // Split line at cursor: before stays on current line, after goes to new line
    const beforeText = currentText.substring(0, cursorPosition)
    const afterText = currentText.substring(cursorPosition)

    store.updateLine(line.id, beforeText)

    let nextType
    if (isBookFormat.value) {
      nextType = 'body-text'
    } else if (line.type === 'scene-heading') {
      nextType = 'action'
    } else {
      nextType = getNextLineType(line.type)
    }

    const newLine = store.addLine(line.id, nextType)
    store.updateLine(newLine.id, afterText)

    if (nextType === 'character') {
      nextTick(() => updateContdStatus(newLine.id, index + 1))
    }

    // Wait for Vue to render the new .line-content, then sync DOM and put cursor at end of new line
    nextTick(() => {
      nextTick(() => {
        const nextElement = lineRefs.value[index + 1]
        if (nextElement) {
          nextElement.innerText = afterText || '\u200B'
          nextElement.contentEditable = 'true'
          nextElement.focus()
          placeCursorAtEnd(nextElement)
        }
      })
    })
  }

  // Tab key - cycle line type
  else if (event.key === 'Tab') {
    event.preventDefault()
    cycleLineType(line.id, line.type)
  }

  // Backspace: Word-like behavior — selection = delete selection; at start of block = move cursor only (no merge)
  else if (event.key === 'Backspace') {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return

    const range = selection.getRangeAt(0)
    const currentElement = lineRefs.value[index] ?? event.target
    const cursorAtStart = (() => {
      try {
        const pre = document.createRange()
        pre.selectNodeContents(currentElement)
        pre.setEnd(range.startContainer, range.startOffset)
        return pre.toString().length === 0
      } catch (_) {
        return false
      }
    })()

    // 1) There is a selection — delete manually to preserve block structure
    if (!range.collapsed) {
      event.preventDefault()
      store.pushToHistory()

      const startLineEl = (range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer)?.closest?.('.line-content')
      const startLineIndexEl = startLineEl?.closest?.('[data-line-index]')
      const startLineIndex = startLineIndexEl != null ? parseInt(startLineIndexEl.getAttribute('data-line-index'), 10) : index
      const startOffset = (() => {
        if (!startLineEl) return 0
        try {
          const r = document.createRange()
          r.selectNodeContents(startLineEl)
          r.setEnd(range.startContainer, range.startOffset)
          return r.toString().length
        } catch (_) {
          return 0
        }
      })()

      const endLineEl = (range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer)?.closest?.('.line-content')
      const selectionInOneLine = startLineEl && endLineEl && startLineEl === endLineEl

      if (selectionInOneLine && startLineEl) {
        // Single line: delete range and sync (preserves block)
        range.deleteContents()
        const newContent = (startLineEl.innerText || startLineEl.textContent || '').replace(/\u200B/g, '')
        const line = lines.value[startLineIndex]
        if (line) store.updateLine(line.id, newContent)
        currentLineIndex.value = startLineIndex
        requestAnimationFrame(() => {
          const el = lineRefs.value[startLineIndex]
          if (el) {
            ensureBlockHasContent(el)
            el.focus()
            const len = (el.innerText || '').replace(/\u200B/g, '').length
            restoreCursorInElement(el, Math.min(startOffset, len), Math.min(startOffset, len))
          }
          scheduleBackspaceSanitize()
        })
      } else {
        // Multi-line: update each affected line in store and DOM (no browser merge)
        const root = editorRootRef.value
        const allLineContents = root ? Array.from(root.querySelectorAll('.line-content')) : []
        const endLineIndexEl = endLineEl?.closest?.('[data-line-index]')
        const endLineIndex = endLineIndexEl != null ? parseInt(endLineIndexEl.getAttribute('data-line-index'), 10) : startLineIndex

        for (let i = 0; i < allLineContents.length; i++) {
          const lineEl = allLineContents[i]
          const lineId = lineEl.closest('.script-line')?.getAttribute('data-line-id')
          const lineIndexEl = lineEl.closest('[data-line-index]')
          const lineIndex = lineIndexEl != null ? parseInt(lineIndexEl.getAttribute('data-line-index'), 10) : i
          if (!lineId || lineIndex < 0) continue
          const fullText = (lineEl.innerText || lineEl.textContent || '').replace(/\u200B/g, '')
          let newText = fullText
          try {
            if (lineEl.contains(range.startContainer) && lineEl.contains(range.endContainer)) {
              const r1 = document.createRange()
              r1.selectNodeContents(lineEl)
              r1.setEnd(range.startContainer, range.startOffset)
              const r2 = document.createRange()
              r2.selectNodeContents(lineEl)
              r2.setStart(range.endContainer, range.endOffset)
              newText = r1.toString() + r2.toString()
            } else if (lineEl.contains(range.startContainer)) {
              const r = document.createRange()
              r.selectNodeContents(lineEl)
              r.setEnd(range.startContainer, range.startOffset)
              newText = r.toString()
            } else if (lineEl.contains(range.endContainer)) {
              const r = document.createRange()
              r.selectNodeContents(lineEl)
              r.setStart(range.endContainer, range.endOffset)
              newText = r.toString()
            } else if (lineIndex > startLineIndex && lineIndex < endLineIndex) {
              newText = ''
            } else {
              continue
            }
          } catch (_) {
            continue
          }
          store.updateLine(lineId, newText)
          lineEl.innerText = newText || '\u200B'
        }
        currentLineIndex.value = startLineIndex
        nextTick(() => {
          const el = lineRefs.value[startLineIndex]
          if (el) {
            ensureBlockHasContent(el)
            el.focus()
            const len = (el.innerText || '').replace(/\u200B/g, '').length
            restoreCursorInElement(el, Math.min(startOffset, len), Math.min(startOffset, len))
          }
          scheduleBackspaceSanitize()
        })
      }
      return
    }

    // 2) Cursor at start of block — move to end of previous line only (no merge, no delete)
    if (cursorAtStart && index > 0) {
      event.preventDefault()
      const prevEl = lineRefs.value[index - 1]
      if (prevEl) {
        prevEl.focus()
        moveCursorToEnd(prevEl)
        currentLineIndex.value = index - 1
      }
      scheduleBackspaceSanitize()
      return
    }

    // 3) Cursor in middle of text — let browser handle one-char delete; sanitizer runs debounced
    scheduleBackspaceSanitize()
  }

  // Arrow keys - navigate between lines
  else if (event.key === 'ArrowUp' && index > 0) {
    const selection = window.getSelection()
    if (!selection.rangeCount) return
    const range = selection.getRangeAt(0)
    const preRange = range.cloneRange()
    preRange.selectNodeContents(currentElement)
    preRange.setEnd(range.startContainer, range.startOffset)
    const cursorPosition = preRange.toString().length

    if (cursorPosition === 0) {
      event.preventDefault()
      const prevElement = lineRefs.value[index - 1]
      if (prevElement) {
        prevElement.focus()
        moveCursorToEnd(prevElement)
      }
    }
  } else if (event.key === 'ArrowDown' && index < lines.value.length - 1) {
    const selection = window.getSelection()
    if (!selection.rangeCount) return
    const range = selection.getRangeAt(0)
    const content = currentElement.innerText || currentElement.textContent || ''
    const preRange = range.cloneRange()
    preRange.selectNodeContents(currentElement)
    preRange.setEnd(range.startContainer, range.startOffset)
    const cursorPosition = preRange.toString().length

    if (cursorPosition >= content.length) {
      event.preventDefault()
      const nextElement = lineRefs.value[index + 1]
      if (nextElement) {
        nextElement.focus()
        moveCursorToStart(nextElement)
      }
    }
  }
}

// Get next line type based on current type
const getNextLineType = (currentType) => {
  if (isBookFormat.value) {
    // For Book format, always create body-text paragraphs
    return 'body-text'
  }

  const typeFlow = {
    'scene-heading': 'action',
    action: 'action',
    character: 'dialogue',
    dialogue: 'action', // After dialogue, force action line
    parenthetical: 'dialogue',
    transition: 'action', // After transition, force action (not scene heading)
  }

  return typeFlow[currentType] || 'action'
}

// Cycle through line types
const cycleLineType = (lineId, currentType) => {
  if (isBookFormat.value) return

  const types = ['scene-heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition']
  const currentIndex = types.indexOf(currentType)
  const nextType = types[(currentIndex + 1) % types.length]

  const line = lines.value.find((l) => l.id === lineId)
  if (line) {
    const lineIndex = lines.value.findIndex((l) => l.id === lineId)
    store.updateLine(lineId, line.content, nextType)
    
    // If changed to character, update (CONT'D) status
    if (nextType === 'character') {
      nextTick(() => {
        updateContdStatus(lineId, lineIndex)
      })
    }
  }
}

// Merge current line with previous line
const mergeWithPreviousLine = (lineId, index) => {
  if (index === 0) return

  const currentLine = lines.value[index]
  const previousLine = lines.value[index - 1]

  if (!currentLine || !previousLine) return

  // Merge content
  const mergedContent = previousLine.content + currentLine.content
  store.updateLine(previousLine.id, mergedContent)

  // Delete current line
  store.deleteLine(lineId)
  
  // If deleted line was character, update (CONT'D) status below
  if (currentLine.type === 'character') {
    updateContdBelow(index - 1)
  }

  // Focus previous line and move cursor to merge point
  nextTick(() => {
    const prevElement = lineRefs.value[index - 1]
    if (prevElement) {
      prevElement.focus()
      const offset = previousLine.content.length
      setCursorPosition(prevElement, offset)
    }
  })
}

// Handle paste - insert as plain text
const handlePaste = (event) => {
  event.preventDefault()

  const text = event.clipboardData.getData('text/plain')
  const selection = window.getSelection()

  if (!selection.rangeCount) return

  selection.deleteFromDocument()
  selection.getRangeAt(0).insertNode(document.createTextNode(text))
  selection.collapseToEnd()
}

// Click on main editor container: if user clicked empty space below content, focus last line and put caret at end
const handleContainerClick = (event) => {
  if (window.getSelection().toString()) return // don't run focus logic when user has selected text (e.g. after drag)
  if (!event.target.closest('.editor-wrapper') || event.target.closest('.line-content')) return
  const lastIdx = lines.value.length - 1
  if (lastIdx < 0) return
  const lastLine = lineRefs.value[lastIdx]
  if (lastLine) {
    lastLine.focus()
    moveCursorToEnd(lastLine)
    currentLineIndex.value = lastIdx
  }
}

// Handle click on editor (outside lines)
const handleEditorClick = (event) => {
  if (window.getSelection().toString()) return // ignore click if it was part of a selection drag (ghost click fix)
  // Update current line index when clicking any line so Force buttons target the right line
  const scriptLine = event.target.closest?.('.script-line')
  const lineIndexEl = event.target.closest?.('[data-line-index]')
  if (scriptLine || lineIndexEl) {
    const idx = lineIndexEl
      ? parseInt(lineIndexEl.getAttribute('data-line-index'), 10)
      : lines.value.findIndex((l) => l.id === scriptLine?.getAttribute?.('data-line-id'))
    if (!isNaN(idx) && idx >= 0) currentLineIndex.value = idx
  }
  if (event.target.classList.contains('script-editor')) {
    const lastLine = lineRefs.value[lines.value.length - 1]
    if (lastLine) {
      lastLine.focus()
      moveCursorToEnd(lastLine)
    }
  }
}

// Cursor utilities
const moveCursorToEnd = (element) => {
  const range = document.createRange()
  const selection = window.getSelection()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

// Place cursor at end and focus (for INT./EXT. and similar - ensures cursor stays at end after content update)
const placeCursorAtEnd = (element) => {
  if (!element) return
  const range = document.createRange()
  const selection = window.getSelection()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
  element.focus()
}

// Place cursor at start of element and focus (for new formatted line so caret is at beginning)
const placeCursorAtStart = (element) => {
  if (!element) return
  const range = document.createRange()
  const selection = window.getSelection()
  range.selectNodeContents(element)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  element.focus()
}

// Restore cursor/selection in a contenteditable by character offsets (used after scene-heading conversion / re-render)
const restoreCursorInElement = (element, startOffset, endOffset) => {
  if (!element) return
  const textNode = element.firstChild
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    moveCursorToEnd(element)
    return
  }
  const len = textNode.length
  const start = Math.min(startOffset, len)
  const end = Math.min(endOffset, len)
  const range = document.createRange()
  range.setStart(textNode, start)
  range.setEnd(textNode, end)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  element.focus()
}

// Capture current selection as { index, startOffset, endOffset } if it's inside a line-content in our editor; else null
const captureCursorPosition = () => {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  const lineContent = range.startContainer.nodeType === Node.TEXT_NODE
    ? range.startContainer.parentElement
    : range.startContainer
  if (!lineContent?.classList?.contains('line-content')) return null
  const lineContainer = lineContent.closest('[data-line-index]')
  if (!lineContainer) return null
  const index = parseInt(lineContainer.getAttribute('data-line-index'), 10)
  if (isNaN(index)) return null
  const preRange = range.cloneRange()
  preRange.selectNodeContents(lineContent)
  preRange.setEnd(range.startContainer, range.startOffset)
  const startOffset = preRange.toString().length
  preRange.setEnd(range.endContainer, range.endOffset)
  const endOffset = preRange.toString().length
  return { index, startOffset, endOffset }
}

// Sync all line content from DOM to store (after programmatic deletion)
const syncAllLinesFromDOM = () => {
  const root = editorRootRef.value
  if (!root) return
  root.querySelectorAll('.script-line').forEach((scriptLine) => {
    const contentEl = scriptLine.querySelector('.line-content')
    const lineId = scriptLine.getAttribute('data-line-id')
    const lineIndexEl = scriptLine.closest('[data-line-index]')
    const index = lineIndexEl != null ? parseInt(lineIndexEl.getAttribute('data-line-index'), 10) : -1
    if (!contentEl || !lineId || index < 0) return
    const line = lines.value.find((l) => l.id === lineId)
    if (!line) return
    const newContent = (contentEl.innerText || contentEl.textContent || '').replace(/\u200B/g, '')
    if (newContent !== line.content) {
      store.updateLine(line.id, newContent)
    }
  })
}

// Ensure a single block (line-content) has at least one child so it stays focusable
const ensureBlockHasContent = (el) => {
  if (!el || !el.closest?.('.script-editor')) return
  if (!el.firstChild) {
    el.appendChild(document.createTextNode('\u200B'))
  }
}

// Debounced sanitizer after Backspace: ensure editor always has at least one block and each block has content (no full re-render)
let backspaceSanitizeTimer = null
const BACKSPACE_SANITIZE_MS = 120
const scheduleBackspaceSanitize = () => {
  if (backspaceSanitizeTimer) clearTimeout(backspaceSanitizeTimer)
  backspaceSanitizeTimer = setTimeout(() => {
    backspaceSanitizeTimer = null
    const root = editorRootRef.value
    if (!root) return
    const lineContents = root.querySelectorAll('.line-content')
    lineContents.forEach((el) => ensureBlockHasContent(el))
  }, BACKSPACE_SANITIZE_MS)
}

// Restore cursor from pendingCursorRestore and clear it (called in nextTick after DOM updates)
const restorePendingCursor = () => {
  const pending = pendingCursorRestore.value
  pendingCursorRestore.value = null
  if (skipNextCursorRestore.value) {
    skipNextCursorRestore.value = false
    return
  }
  if (pending && lineRefs.value[pending.index]) {
    restoreCursorInElement(lineRefs.value[pending.index], pending.startOffset, pending.endOffset)
  }
}

const moveCursorToStart = (element) => {
  const range = document.createRange()
  const selection = window.getSelection()
  range.selectNodeContents(element)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

const setCursorPosition = (element, offset) => {
  const range = document.createRange()
  const selection = window.getSelection()

  const textNode = element.firstChild
  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    const safeOffset = Math.min(offset, textNode.length)
    range.setStart(textNode, safeOffset)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

// Get character offset in element from a point (clientX, clientY) - works across browsers
function getOffsetAtPoint(element, clientX, clientY) {
  if (!element) return 0
  const doc = element.ownerDocument
  let range = null
  if (doc.caretRangeFromPoint) {
    range = doc.caretRangeFromPoint(clientX, clientY)
  } else if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(clientX, clientY)
    if (pos) {
      range = doc.createRange()
      range.setStart(pos.offsetNode, pos.offset)
      range.setEnd(pos.offsetNode, pos.offset)
    }
  }
  if (!range) return 0
  try {
    const preRange = doc.createRange()
    preRange.selectNodeContents(element)
    preRange.setEnd(range.startContainer, range.startOffset)
    return preRange.toString().length
  } catch (e) {
    return 0
  }
}

// Handle mouse down for cross-line selection
const handleMouseDown = (event, lineIndex) => {
  isSelecting.value = true
  const element = lineRefs.value[lineIndex] || event.target.closest('.line-content')
  const offset = getOffsetAtPoint(element, event.clientX, event.clientY)
  
  selectionStart.value = {
    lineIndex,
    offset,
    element
  }
}

// Handle mouse up for cross-line selection
const handleMouseUp = (event, lineIndex) => {
  if (!isSelecting.value) {
    selectionStart.value = { lineIndex: null, offset: null, element: null }
    return
  }
  
  const selection = window.getSelection()
  const startLine = selectionStart.value.lineIndex
  const endLine = lineIndex
  const endElement = lineRefs.value[endLine]

  // If selection spans multiple lines, create a custom range
  if (startLine !== null && startLine !== endLine && endElement) {
    const startElement = lineRefs.value[startLine]
    
    if (startElement && endElement) {
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null
      const endOffset = range ? getCursorOffsetInElement(endElement, range) : (endElement.textContent || '').length
      
      const newRange = document.createRange()
      
      // Determine direction
      const isForward = endLine > startLine
      const actualStartLine = isForward ? startLine : endLine
      const actualEndLine = isForward ? endLine : startLine
      const actualStartEl = lineRefs.value[actualStartLine]
      const actualEndEl = lineRefs.value[actualEndLine]
      const actualStartOffset = isForward ? selectionStart.value.offset : endOffset
      const actualEndOffset = isForward ? endOffset : selectionStart.value.offset
      
      const startPoint = getPointInElement(actualStartEl, actualStartOffset)
      const endPoint = getPointInElement(actualEndEl, actualEndOffset)
      
      if (startPoint && endPoint) {
        newRange.setStart(startPoint.node, startPoint.offset)
        newRange.setEnd(endPoint.node, endPoint.offset)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }
    }
  }
  
  isSelecting.value = false
  selectionStart.value = { lineIndex: null, offset: null, element: null }
}

// Handle mouse leave - continue selection if dragging
const handleMouseLeave = (event, lineIndex) => {
  // Selection continues when dragging across lines
  // The mouseup will finalize the selection
}

// Get cursor offset within an element
const getCursorOffsetInElement = (element, range) => {
  if (!element || !range) return 0
  try {
    const preRange = range.cloneRange()
    preRange.selectNodeContents(element)
    preRange.setEnd(range.startContainer, range.startOffset)
    return preRange.toString().length
  } catch (e) {
    return 0
  }
}

// Throttle: only run selection update once per frame to avoid lag/jitter during drag
let globalMouseMoveRafId = null
let lastGlobalMouseEvent = null

const handleGlobalMouseMove = (event) => {
  if (!isSelecting.value) return
  lastGlobalMouseEvent = event
  if (globalMouseMoveRafId != null) return
  globalMouseMoveRafId = requestAnimationFrame(() => {
    globalMouseMoveRafId = null
    const e = lastGlobalMouseEvent
    if (!e || !isSelecting.value) return

    // Find which line element the mouse is over (use elementsFromPoint so we get .line-content even under overlay)
    let lineContent = e.target.closest('.line-content')
    if (!lineContent && document.elementsFromPoint) {
      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      lineContent = elements.find((el) => el.classList && el.classList.contains('line-content'))
    }
    if (!lineContent) return

    const lineContainer = lineContent.closest('[data-line-index]')
    if (!lineContainer) return

    const lineIndex = parseInt(lineContainer.getAttribute('data-line-index'))
    if (isNaN(lineIndex)) return

    // If we're over a different line, update selection (no state updates - only Selection API)
    if (selectionStart.value.lineIndex !== null && lineIndex !== selectionStart.value.lineIndex) {
      const selection = window.getSelection()
      const startLine = selectionStart.value.lineIndex
      const endLine = lineIndex

      if (startLine !== endLine) {
        const startElement = lineRefs.value[startLine]
        const endElement = lineRefs.value[endLine]

        if (startElement && endElement) {
          const endOffset = getOffsetAtPoint(endElement, e.clientX, e.clientY)

          const newRange = document.createRange()
          const isForward = endLine > startLine
          const actualStartLine = isForward ? startLine : endLine
          const actualEndLine = isForward ? endLine : startLine
          const actualStartEl = lineRefs.value[actualStartLine]
          const actualEndEl = lineRefs.value[actualEndLine]
          const actualStartOffset = isForward ? selectionStart.value.offset : endOffset
          const actualEndOffset = isForward ? endOffset : selectionStart.value.offset

          const startPoint = getPointInElement(actualStartEl, actualStartOffset)
          const endPoint = getPointInElement(actualEndEl, actualEndOffset)

          if (startPoint && endPoint) {
            newRange.setStart(startPoint.node, startPoint.offset)
            newRange.setEnd(endPoint.node, endPoint.offset)
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
        }
      }
    }
  })
}

// Watch for external content changes (episode switching, undo, etc)
watch(
  () => lines.value.length,
  (newLength, oldLength) => {
    // Only react to length changes (add/delete lines)
    if (newLength !== oldLength) {
      isExternalUpdate.value = true
      nextTick(() => {
        // Update line refs array
        lineRefs.value = lineRefs.value.slice(0, newLength)
        calculatePageBreaks()
        isExternalUpdate.value = false
      })
    }
  },
)

// Watch for episode/season changes (TV Show format) - sync DOM content
watch(
  () => [store.activeProject?.activeEpisodeId, store.activeProject?.activeSeasonIndex],
  () => {
    if (store.activeProject?.format === 'TV Show') {
      // Episode or season switched - sync all DOM content with new lines
      isExternalUpdate.value = true
      nextTick(() => {
        lines.value.forEach((line, index) => {
          const el = lineRefs.value[index]
          if (el) {
            el.innerText = line.content || ''
          }
        })
        calculatePageBreaks()
        isExternalUpdate.value = false
        
        // Update all (CONT'D) statuses after episode/season switch
        lines.value.forEach((line, index) => {
          if (line.type === 'character') {
            updateContdStatus(line.id, index)
          }
        })
      })
    }
  },
)

// Watch for undo/redo or array replacement - need to update DOM
watch(
  () => store.activeProject?.lines,
  (newLines, oldLines) => {
    if (!newLines) return

    // If oldLines is null/undefined, this is an initial load or array replacement (import / episode switch)
    if (!oldLines || newLines !== oldLines) {
      // Capture cursor before DOM sync so we can restore after (e.g. idle delay re-render)
      const captured = captureCursorPosition()
      if (captured) {
        pendingCursorRestore.value = { index: captured.index, startOffset: captured.startOffset, endOffset: captured.endOffset }
      }
      // Array reference changed (episode switch or fountain import) – ensure editor is editable, then sync DOM after refs are set
      isExternalUpdate.value = true
      nextTick(ensureEditorEditable)
      nextTick(() => {
        nextTick(() => {
          newLines.forEach((line, index) => {
            const el = lineRefs.value[index]
            if (el) {
              el.innerText = line.content || ''
            }
          })
          calculatePageBreaks()
          isExternalUpdate.value = false
          newLines.forEach((line, index) => {
            if (line.type === 'character') {
              updateContdStatus(line.id, index)
            }
          })
          restorePendingCursor()
        })
      })
      return
    }

    // Check if this is an external update (undo/redo)
    // by comparing if content changed but we didn't trigger it
    if (!isExternalUpdate.value && newLines.length === oldLines.length) {
      // Capture cursor before DOM sync so we can restore after (e.g. idle delay re-render)
      const captured = captureCursorPosition()
      if (captured) {
        pendingCursorRestore.value = { index: captured.index, startOffset: captured.startOffset, endOffset: captured.endOffset }
      }
      // Content might have changed from undo/redo
      nextTick(() => {
        newLines.forEach((line, index) => {
          const el = lineRefs.value[index]
          if (el && el.innerText !== line.content) {
            // Save cursor position
            const selection = window.getSelection()
            const hasFocus = el.contains(selection.anchorNode)

            if (!hasFocus) {
              // Update content only if not focused
              el.innerText = line.content
            }
          }
        })
        
        // After undo/redo, update all (CONT'D) statuses
        newLines.forEach((line, index) => {
          if (line.type === 'character') {
            updateContdStatus(line.id, index)
          }
        })
        restorePendingCursor()
      })
    }
  },
  { deep: true },
)

// Update annotation underlines when annotations or lines change
watch(
  () => [store.activeProject?.annotations?.length ?? 0, lines.value.length],
  () => {
    nextTick(updateAnnotationRects)
  },
)

// Dispatch force line type (for mobile toolbar buttons)
const forceLineTypeWithFocus = (type, contentOverride) => {
  const detail = { type, restoreFocus: true }
  if (contentOverride != null) detail.contentOverride = contentOverride
  window.dispatchEvent(new CustomEvent('force-line-type', { detail }))
}

// Force line type handler: act on a new line only; never transform or drag existing text.
// - If current line is empty: apply the requested type to it and focus with caret at start (or at end of contentOverride).
// - If current line has content: insert a new line below with the requested type (empty or contentOverride), focus it, caret at start (or at end of contentOverride).
const handleForceLineType = (event) => {
  const { type, restoreFocus, contentOverride } = event.detail || {}
  const resolvedType = isBookFormat.value && type === 'scene-heading' ? 'chapter-title' : type
  const currentLine = lines.value[currentLineIndex.value]
  if (!currentLine) return

  const currentContent = (currentLine.content || '').trim()
  const isCurrentEmpty = currentContent === ''

  // Content for the line we're formatting: only allow override (e.g. "INT. "), never existing text
  const lineContent = contentOverride != null ? contentOverride : ''

  store.pushToHistory()

  if (isCurrentEmpty) {
    // Apply type to the existing empty line; do not create a new one
    store.updateLine(currentLine.id, lineContent, resolvedType)
    nextTick(() => {
      const el = lineRefs.value[currentLineIndex.value]
      if (el) {
        el.innerText = lineContent || '\u200B'
        ensureBlockHasContent(el)
        if (restoreFocus) {
          if (lineContent) placeCursorAtEnd(el)
          else placeCursorAtStart(el)
        }
      }
    })
    if (resolvedType === 'character') {
      nextTick(() => updateContdStatus(currentLine.id, currentLineIndex.value))
    }
    if (resolvedType === 'scene-heading' || resolvedType === 'chapter-title') {
      store.selectedSceneId = null
    }
    return
  }

  // Current line has content: create a new line below with the requested type (empty or contentOverride only)
  const newLine = store.addLine(currentLine.id, resolvedType)
  store.updateLine(newLine.id, lineContent)

  const newIndex = currentLineIndex.value + 1
  currentLineIndex.value = newIndex

  nextTick(() => {
    nextTick(() => {
      const el = lineRefs.value[newIndex]
      if (el) {
        el.innerText = lineContent || '\u200B'
        ensureBlockHasContent(el)
        if (restoreFocus) {
          if (lineContent) placeCursorAtEnd(el)
          else placeCursorAtStart(el)
        }
      }
    })
  })

  if (resolvedType === 'character') {
    nextTick(() => updateContdStatus(newLine.id, newIndex))
  }
  if (resolvedType === 'scene-heading' || resolvedType === 'chapter-title') {
    store.selectedSceneId = null
  }
}

// Handle keyboard shortcuts for force line types (fallback for when not in editor)
const handleForceShortcuts = (event) => {
  // Only handle if CTRL is pressed and not in input fields
  if (!event.ctrlKey || event.metaKey) return
  
  const target = event.target
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
  if (isInput && target.contentEditable !== 'true') return
  
  // Check if we're in a contenteditable (editor line)
  const isContentEditable = target.contentEditable === 'true'
  if (!isContentEditable) return
  
  const keyMap = {
    '1': 'scene-heading',
    '2': 'action',
    '3': 'character',
    '4': 'dialogue',
    '5': 'transition'
  }
  
  if (keyMap[event.key]) {
    event.preventDefault()
    window.dispatchEvent(new CustomEvent('force-line-type', { detail: { type: keyMap[event.key], restoreFocus: true } }))
  }
}

// Handle chapter title shortcut (Cmd+Shift+C for Book format)
const handleChapterTitleShortcut = (event) => {
  if (!isBookFormat.value) return
  
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'C') {
    const target = event.target
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
    if (isInput && target.contentEditable !== 'true') return
    
    const isContentEditable = target.contentEditable === 'true'
    if (!isContentEditable) return
    
    event.preventDefault()
    window.dispatchEvent(new CustomEvent('force-line-type', { detail: { type: 'chapter-title', restoreFocus: true } }))
  }
}

// Handle scroll to scene
const handleScrollToScene = (event) => {
  const { lineIndex } = event.detail
  const lineElement = lineRefs.value[lineIndex]
  
  if (lineElement && containerRef.value) {
    // Get the script-line container
    const scriptLine = lineElement.closest('.script-line')
    if (scriptLine) {
      // Scroll to the line
      scriptLine.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Focus the line after a short delay
      setTimeout(() => {
        lineElement.focus()
        moveCursorToStart(lineElement)
      }, 300)
    }
  }
}

// Annotation (inline note) handlers
const handleContextMenu = (event, lineId) => {
  const selection = window.getSelection()
  const selectedText = selection ? selection.toString().trim() : ''
  if (!selectedText) return
  event.preventDefault()
  event.stopPropagation()
  pendingAnnotation.value = { lineId, anchorText: selectedText }
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY }
}

const openNotePopover = () => {
  contextMenu.value.visible = false
  const selection = window.getSelection()
  let rect = { left: 200, top: 200 }
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    rect = range.getBoundingClientRect()
  }
  notePopoverContent.value = ''
  notePopover.value = {
    visible: true,
    x: rect.left,
    y: rect.bottom + 8,
  }
  nextTick(() => {
    if (notePopoverTextarea.value) {
      notePopoverTextarea.value.focus()
    }
  })
}

const closeNotePopover = () => {
  notePopover.value.visible = false
  notePopoverContent.value = ''
  pendingAnnotation.value = { lineId: null, anchorText: '' }
  contextMenu.value.visible = false
}

const saveNote = () => {
  const { lineId, anchorText } = pendingAnnotation.value
  if (!lineId || !anchorText) {
    closeNotePopover()
    return
  }
  store.pushToHistory()
  store.addAnnotation({
    lineId,
    anchorText,
    noteContent: notePopoverContent.value || '',
  })
  closeNotePopover()
  nextTick(updateAnnotationRects)
}

const closeContextMenuAndPopoverOnClickOutside = (event) => {
  const target = event.target
  if (
    contextMenu.value.visible &&
    !target.closest('.annotation-context-menu')
  ) {
    contextMenu.value.visible = false
  }
  if (
    notePopover.value.visible &&
    !target.closest('.annotation-note-popover') &&
    !target.closest('.annotation-context-menu')
  ) {
    closeNotePopover()
  }
  if (floatingNote.value && !target.closest('.floating-note-card') && !target.closest('.annotation-underline')) {
    closeFloatingNote()
  }
}

// Get (node, offset) for a single character position in element (works with multiple text nodes)
function getPointInElement(element, charOffset) {
  if (!element) return null
  let current = 0
  let lastTextNode = null
  let lastLength = 0

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length
      lastTextNode = node
      lastLength = len
      if (current + len >= charOffset) {
        const offset = Math.min(charOffset - current, len)
        return { node, offset }
      }
      current += len
      return null
    }
    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      for (let i = 0; i < node.childNodes.length; i++) {
        const result = walk(node.childNodes[i])
        if (result) return result
      }
    }
    return null
  }

  const result = walk(element)
  if (result) return result
  if (lastTextNode !== null) return { node: lastTextNode, offset: lastLength }
  return null
}

// Build a DOM Range for character span [charStart, charEnd) inside element (works with multiple text nodes)
function getTextRangeInElement(element, charStart, charEnd) {
  const range = document.createRange()
  let current = 0
  let startSet = false
  let endSet = false

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length
      if (!startSet && current + len > charStart) {
        range.setStart(node, Math.min(charStart - current, len))
        startSet = true
      }
      if (!endSet && current + len >= charEnd) {
        range.setEnd(node, Math.min(charEnd - current, len))
        endSet = true
        return true
      }
      current += len
      return false
    }
    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (walk(node.childNodes[i])) return true
      }
    }
    return false
  }

  walk(element)
  return startSet && endSet ? range : null
}

// Update positions of annotation underlines (anchorText in line DOM)
function updateAnnotationRects() {
  const project = store.activeProject
  if (!project || !project.annotations || !lineRefs.value.length) {
    annotationRects.value = []
    return
  }
  const lineIds = new Set(project.lines.map((l) => l.id))
  const rects = []
  for (const ann of project.annotations) {
    if (!lineIds.has(ann.lineId) || !ann.anchorText) continue
    const lineIndex = project.lines.findIndex((l) => l.id === ann.lineId)
    if (lineIndex < 0) continue
    const lineEl = lineRefs.value[lineIndex]
    if (!lineEl) continue
    const text = (lineEl.textContent || '').replace(/\u200B/g, '')
    const start = text.indexOf(ann.anchorText)
    if (start === -1) continue
    const end = start + ann.anchorText.length
    try {
      const range = getTextRangeInElement(lineEl, start, end)
      if (!range) continue
      const rect = range.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        rects.push({
          id: ann.id,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          annotation: ann,
        })
      }
    } catch (_) {
      // ignore
    }
  }
  annotationRects.value = rects
}

function showFloatingNote(rect) {
  const { annotation } = rect
  floatingNote.value = {
    x: rect.left,
    y: rect.top + rect.height + 4,
    anchorText: annotation.anchorText,
    noteContent: annotation.noteContent,
    id: annotation.id,
  }
}

function closeFloatingNote() {
  floatingNote.value = null
}

function deleteFloatingNote() {
  if (floatingNote.value) {
    store.deleteAnnotation(floatingNote.value.id)
    closeFloatingNote()
    nextTick(updateAnnotationRects)
  }
}

// Remove pointer-events: none and user-select: none from editor and ancestors so imported content is editable
function ensureEditorEditable() {
  const root = editorRootRef.value
  if (!root) return
  let el = root
  while (el && el !== document.body) {
    const style = el.style
    if (style.pointerEvents === 'none') style.pointerEvents = ''
    if (style.userSelect === 'none') style.userSelect = ''
    el = el.parentElement
  }
}

// Initialize
onMounted(() => {
  // Calculate initial page breaks
  calculatePageBreaks()
  nextTick(ensureEditorEditable)

  // Focus first line if exists (use nextTick to ensure refs are set)
  nextTick(() => {
    if (lines.value.length > 0) {
      const firstLine = lineRefs.value[0]
      if (firstLine) {
        firstLine.focus()
        // Ensure cursor is visible
        const range = document.createRange()
        const selection = window.getSelection()
        range.selectNodeContents(firstLine)
        range.collapse(false) // Move to end
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  })

  // Recalculate on window resize
  window.addEventListener('resize', calculatePageBreaks)

  // Annotation underlines: update positions on scroll and after mount
  nextTick(() => {
    updateAnnotationRects()
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', updateAnnotationRects)
    }
  })

  // Close context menu and note popover when clicking outside
  document.addEventListener('click', closeContextMenuAndPopoverOnClickOutside)
  
  // Listen for force line type events
  window.addEventListener('force-line-type', handleForceLineType)
  
  // Listen for keyboard shortcuts
  document.addEventListener('keydown', handleForceShortcuts)
  
  // Listen for chapter title shortcut (Book format)
  document.addEventListener('keydown', handleChapterTitleShortcut)
  
  // Listen for scroll to scene events
  window.addEventListener('scroll-to-scene', handleScrollToScene)
  
  // Listen for global mouse move for cross-line selection
  document.addEventListener('mousemove', handleGlobalMouseMove)
  
  // Listen for global mouse up to end selection
  document.addEventListener('mouseup', () => {
    if (isSelecting.value) {
      isSelecting.value = false
      selectionStart.value = { lineIndex: null, offset: null, element: null }
    }
  })

  // Visual Viewport API: make mobile toolbar follow keyboard
  if (props.isMobile && window.visualViewport) {
    updateToolbarBottomOffset()
    window.visualViewport.addEventListener('resize', updateToolbarBottomOffset)
    window.visualViewport.addEventListener('scroll', updateToolbarBottomOffset)
  }
})

// Cleanup
onUnmounted(() => {
  if (globalMouseMoveRafId != null) {
    cancelAnimationFrame(globalMouseMoveRafId)
    globalMouseMoveRafId = null
  }
  window.removeEventListener('resize', calculatePageBreaks)
  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', updateAnnotationRects)
  }
  window.removeEventListener('force-line-type', handleForceLineType)
  document.removeEventListener('keydown', handleForceShortcuts)
  document.removeEventListener('keydown', handleChapterTitleShortcut)
  window.removeEventListener('scroll-to-scene', handleScrollToScene)
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('click', closeContextMenuAndPopoverOnClickOutside)
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', updateToolbarBottomOffset)
    window.visualViewport.removeEventListener('scroll', updateToolbarBottomOffset)
  }
})
</script>

<style scoped>
.editor-container {
  flex: 1;
  overflow: auto;
  background-color: #f0f0f0;
  padding: 12px 8px;
  display: flex;
  justify-content: center;
  position: relative;
  transition: all 0.3s ease;
  user-select: text !important;
  -webkit-user-select: text !important;
}

.editor-container.full-page-view {
  padding: 8px 6px;
}

.editor-wrapper {
  width: 794px; /* A4 width – fixed; do not scale with browser; scroll left/right if narrower */
  min-width: 794px;
  background: white;
  min-height: max(1123px, 100vh); /* At least A4 or full viewport so the whole paper is clickable */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  padding: 72px 90px 72px 72px; /* Standard margins */
  transition: all 0.3s ease;
  user-select: text;
  -webkit-user-select: text;
}

/* Book format - A4 page styling */
.script-editor.book-format .editor-wrapper {
  background: white;
  padding: 72px 90px 72px 72px; /* Standard A4 margins */
}

.editor-container.full-page-view .editor-wrapper {
  /* Keep fixed width – do not shrink with browser; horizontal scroll if needed */
  width: 794px;
  min-width: 794px;
  zoom: 1.35; /* Uniform scale for full page view only */
}

.script-editor {
  font-family: 'Courier New', Courier, monospace;
  font-size: 12pt;
  line-height: 1.2;
  outline: none;
  min-height: 100%;
  cursor: text;
  transition: all 0.3s ease;
  -webkit-user-select: text;
  user-select: text;
}

.editor-container.full-page-view .editor-wrapper {
  /* Reduce shadow in full page view (reduced by 70%) */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.045);
}

/* No gaps between blocks: use padding only so mouse cannot fall through */
/* contain: content limits layout recalc to the block (smoother native selection) */
.script-line {
  position: relative;
  display: flex;
  min-height: 14.4pt;
  margin: 0;
  transition: all 0.3s ease;
  contain: content;
}

.script-line .line-content {
  display: block;
  position: relative;
  contain: content;
}

.block-element {
  user-select: text !important;
  -webkit-user-select: text !important;
  pointer-events: all !important;
}

/* Professional selection highlight */
.script-editor ::selection {
  background: rgba(0, 120, 215, 0.3);
}

.line-content {
  flex: 1;
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  min-height: 14.4pt;
  cursor: text;
  -webkit-user-select: text !important;
  user-select: text !important;
  pointer-events: all !important;
}

.line-content:empty:before {
  content: '\200B';
  pointer-events: none;
}

/* Scene heading – padding only, no margin (no gaps) */
.line-scene-heading {
  padding-top: 24pt;
  padding-bottom: 12pt;
  margin: 0;
}

.line-scene-heading:first-child {
  padding-top: 0;
}

.line-scene-heading .line-content {
  font-weight: bold;
  text-transform: uppercase;
}

.scene-number {
  position: absolute;
  left: -60px;
  color: #999;
  font-size: 11pt;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  width: 50px;
  text-align: right;
  padding-right: 10px;
  pointer-events: none;
  cursor: default;
  line-height: 1.2;
  top: 0;
  transition: all 0.3s ease;
}

/* Action – padding only */
.line-action {
  padding-bottom: 12pt;
  margin: 0;
}

/* Character */
.line-character {
  margin-left: 240px;
  padding-top: 12pt;
  margin-top: 0;
  margin-bottom: 0;
}

.line-character .line-content {
  text-transform: uppercase;
}

/* Dialogue */
.line-dialogue {
  margin-left: 156px;
  margin-right: 156px;
  padding-bottom: 12pt;
  margin-top: 0;
  margin-bottom: 0;
}

/* Parenthetical */
.line-parenthetical {
  margin-left: 204px;
  margin-right: 204px;
  margin-top: 0;
  margin-bottom: 0;
}

.line-parenthetical .line-content {
  font-style: italic;
}

/* Transition – padding only */
.line-transition {
  padding-top: 12pt;
  padding-bottom: 12pt;
  margin: 0;
  justify-content: flex-end;
}

.line-transition .line-content {
  text-transform: uppercase;
  font-weight: bold;
  text-align: right;
  max-width: 200px;
}

/* Note */
.line-note {
  opacity: 0.5;
  font-style: italic;
  color: #333;
}

.line-note .line-content {
  color: #333;
  font-style: italic;
}

:global(body.dark-mode) .line-note .line-content {
  color: #666;
}

/* Book format - Word-like editor */
.script-editor.book-format {
  font-family: 'Times New Roman', 'Georgia', 'Garamond', serif;
  font-size: 12pt;
  line-height: 1.6;
  text-align: justify;
}

/* Body text paragraphs */
.line-body-text {
  padding-bottom: 0;
  margin: 0;
  text-indent: 1.5em;
  text-align: justify;
}

.line-body-text .line-content {
  text-align: justify;
}

/* Chapter title – padding only */
.line-chapter-title {
  page-break-before: always;
  padding-top: 60px;
  padding-bottom: 40px;
  margin: 0;
  text-align: center;
}

.line-chapter-title:first-child {
  page-break-before: auto;
  padding-top: 0;
}

.line-chapter-title .line-content {
  font-size: 18pt;
  font-weight: bold;
  text-align: center;
  text-transform: none;
}

/* Debug panel */
.debug-panel {
  position: fixed;
  top: 100px;
  right: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 12px;
  z-index: 1000;
  font-family: system-ui;
}

.debug-panel div {
  margin-bottom: 5px;
}

/* Page break indicator */
.page-break-indicator {
  position: relative;
  margin: 20px 0;
  padding: 0;
  user-select: none;
  pointer-events: none;
}

.page-break-line {
  display: block;
  border-top: 1px solid #e0e0e0;
  width: 100%;
  margin: 0;
}

.page-break-label {
  display: none;
}

/* Dark mode */
:global(body.dark-mode) .editor-wrapper {
  background: #353535; /* Light grey so the page stands out */
  color: #e0e0e0;
}

:global(body.dark-mode) .editor-container {
  background: #1a1a1a;
}

:global(body.dark-mode) .scene-number {
  color: #666;
}

:global(body.dark-mode) .debug-panel {
  background: #2a2a2a;
  color: #e0e0e0;
}

:global(body.dark-mode) .page-break-line {
  border-top-color: #444;
}

/* Annotation context menu */
.annotation-context-menu {
  position: fixed;
  z-index: 10000;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 140px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.context-menu-item:hover {
  background: #f0f0f0;
}

:global(body.dark-mode) .annotation-context-menu {
  background: #2a2a2a;
  border-color: #555;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

:global(body.dark-mode) .context-menu-item {
  color: #e0e0e0;
}

:global(body.dark-mode) .context-menu-item:hover {
  background: #333;
}

/* Note popover */
.annotation-note-popover {
  position: fixed;
  z-index: 10001;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  padding: 16px;
  min-width: 280px;
  max-width: 400px;
}

.note-popover-header {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.note-popover-textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.note-popover-textarea:focus {
  outline: none;
  border-color: #1976d2;
}

.note-popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.note-popover-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  transition: all 0.2s;
}

.note-popover-btn.cancel:hover {
  background: #f5f5f5;
}

.note-popover-btn.save {
  background: #1976d2;
  border-color: #1976d2;
  color: white;
}

.note-popover-btn.save:hover {
  background: #1565c0;
}

:global(body.dark-mode) .annotation-note-popover {
  background: #2a2a2a;
  border-color: #555;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

:global(body.dark-mode) .note-popover-header {
  color: #e0e0e0;
}

:global(body.dark-mode) .note-popover-textarea {
  background: #1a1a1a;
  border-color: #555;
  color: #e0e0e0;
}

:global(body.dark-mode) .note-popover-btn {
  border-color: #555;
  background: #333;
  color: #e0e0e0;
}

:global(body.dark-mode) .note-popover-btn.save {
  background: #1976d2;
  border-color: #1976d2;
  color: white;
}

/* Annotation underlines overlay */
.annotation-underlines-layer {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}

.annotation-underline {
  position: fixed;
  pointer-events: auto;
  cursor: pointer;
  border-bottom: 2px solid #f59e0b;
  box-sizing: border-box;
  transition: background 0.15s;
}

.annotation-underline:hover {
  background: rgba(245, 158, 11, 0.15);
}

:global(body.dark-mode) .annotation-underline {
  border-bottom-color: #fbbf24;
}

:global(body.dark-mode) .annotation-underline:hover {
  background: rgba(251, 191, 36, 0.2);
}

/* Floating note card (stands alone, not in sidebar) */
.floating-note-card {
  position: fixed;
  z-index: 10002;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  padding: 16px;
  min-width: 260px;
  max-width: 360px;
}

.floating-note-anchor {
  font-size: 12px;
  color: #666;
  font-style: italic;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.floating-note-content {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 12px;
}

.floating-note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.floating-note-close,
.floating-note-delete {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  transition: all 0.2s;
}

.floating-note-close:hover {
  background: #f5f5f5;
}

.floating-note-delete:hover {
  background: #fee2e2;
  border-color: #f87171;
  color: #b91c1c;
}

:global(body.dark-mode) .floating-note-card {
  background: #2a2a2a;
  border-color: #555;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

:global(body.dark-mode) .floating-note-anchor {
  color: #999;
  border-bottom-color: #444;
}

:global(body.dark-mode) .floating-note-content {
  color: #e0e0e0;
}

:global(body.dark-mode) .floating-note-close,
:global(body.dark-mode) .floating-note-delete {
  border-color: #555;
  background: #333;
  color: #e0e0e0;
}

:global(body.dark-mode) .floating-note-delete:hover {
  background: #4a1a1a;
  border-color: #f87171;
  color: #fca5a5;
}

/* Mobile: Toolbar at bottom - sticks to top of keyboard */
.editor-container.has-mobile-force-bar {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
}

.mobile-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 9999;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 8px 12px;
  padding-bottom: env(safe-area-inset-bottom);
  background: transparent;
}

.mobile-toolbar .force-btn-square {
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-toolbar .force-btn {
  height: 32px;
  min-width: 120px;
  padding: 0 24px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.mobile-toolbar .force-btn:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.95);
}

:global(body.dark-mode) .mobile-toolbar .force-btn {
  color: #e0e0e0;
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

:global(body.dark-mode) .mobile-toolbar .force-btn:active {
  background: rgba(255, 255, 255, 0.18);
}

/* Square buttons: override min-width from .force-btn */
.mobile-toolbar .force-btn.force-btn-square {
  width: 46px !important;
  min-width: 46px !important;
  height: 32px !important;
  padding: 0 !important;
}
</style>
