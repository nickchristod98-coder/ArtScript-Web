<!-- SimplifiedScriptEditor.vue -->
<template>
  <div class="editor-container" ref="containerRef" :class="{ 'full-page-view': store.fullPageView }">
    <div class="editor-wrapper">
      <div
        class="script-editor"
        :class="{ 'book-format': isBookFormat }"
        @click="handleEditorClick"
      >
        <!-- Render each line as a separate contenteditable -->
        <div v-for="(line, index) in lines" :key="line.id" :data-line-index="index">
          <!-- Page break indicator -->
          <div v-if="pageBreaks.has(index) && index > 0" class="page-break-indicator">
            <span class="page-break-line"></span>
          </div>

          <div :class="['script-line', `line-${line.type}`]" :data-line-id="line.id">
            <span v-if="line.type === 'scene-heading' && !isBookFormat" class="scene-number" contenteditable="false">
              {{ getSceneNumber(index) }}
            </span>
            <div
              :ref="(el) => setLineRef(el, index)"
              class="line-content"
              contenteditable="true"
              @input="handleLineInput($event, line.id, index)"
              @keydown="handleKeyDown($event, line, index)"
              @paste="handlePaste"
              @focus="currentLineIndex = index"
              @mousedown="handleMouseDown($event, index)"
              @mouseup="handleMouseUp($event, index)"
              @mouseleave="handleMouseLeave($event, index)"
              @contextmenu="handleContextMenu($event, line.id)"
              :spellcheck="store.spellCheckEnabled"
              :lang="store.spellGrammarLanguage ? store.spellGrammarLanguage.split('-')[0] : 'en'"
            ></div>
          </div>
        </div>
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
})

const store = useProjectStore()
const containerRef = ref(null)
const lineRefs = ref([])
const currentLineIndex = ref(0)
const ignoreNextUpdate = ref(false)
const pageBreaks = ref(new Set()) // Track which lines start new pages
const isExternalUpdate = ref(false) // Track if update is from undo/redo
const isSelecting = ref(false) // Track if user is selecting across lines
const selectionStart = ref({ lineIndex: null, offset: null }) // Track selection start

// Annotation (inline note) state
const contextMenu = ref({ visible: false, x: 0, y: 0 })
const notePopover = ref({ visible: false, x: 0, y: 0, content: '' })
const notePopoverContent = ref('')
const pendingAnnotation = ref({ lineId: null, anchorText: '' })
const notePopoverTextarea = ref(null)
const annotationRects = ref([]) // { id, left, top, width, height, annotation }
const floatingNote = ref(null) // { x, y, anchorText, noteContent, id } when showing floating card

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
    // Set content immediately - ensure it's always set, even if empty
    const content = line.content || ''
    if (el.innerText !== content) {
      el.innerText = content
    }
    
    // Ensure the element is focusable and editable
    el.setAttribute('contenteditable', 'true')
    el.setAttribute('tabindex', '0')
    
    // If empty, add a zero-width space to make it focusable
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

// Handle line content change
const handleLineInput = (event, lineId, index) => {
  let newContent = event.target.innerText
  // Remove zero-width space if present
  if (newContent === '\u200B') {
    newContent = ''
  }

  // Prevent reactivity loop
  isExternalUpdate.value = false

  // Update store
  const line = lines.value.find((l) => l.id === lineId)
  if (line) {
    const previousContent = line.content
    const previousType = line.type
    
    // Directly update without triggering watcher
    line.content = newContent

    // Auto-detect type changes
    autoDetectType(lineId, newContent)
    
    // If this is a character line, update (CONT'D) status
    if (line.type === 'character') {
      updateContdStatus(lineId, index)
      // Update DOM with potentially modified content
      const updatedContent = line.content
      if (updatedContent !== newContent && event.target.innerText !== updatedContent) {
        event.target.innerText = updatedContent
        // Restore cursor position
        nextTick(() => {
          const selection = window.getSelection()
          if (selection.rangeCount) {
            const range = selection.getRangeAt(0)
            const textNode = event.target.firstChild
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
      // If character name changed, update lines below
      if (previousContent !== newContent || previousType !== line.type) {
        updateContdBelow(index)
      }
    }

    // Recalculate page breaks (debounced)
    debouncePageBreaks()
  }
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

// Auto-detect line type based on content
const autoDetectType = (lineId, content) => {
  // Disable auto-detection for Book format (Word-like behavior)
  if (isBookFormat.value) return

  const trimmed = content.trim()
  const upper = trimmed.toUpperCase()

  const line = lines.value.find((l) => l.id === lineId)
  if (!line) return
  
  const previousType = line.type
  const lineIndex = lines.value.findIndex((l) => l.id === lineId)

  // Detect notes (check first - lines starting with "//")
  if (trimmed.startsWith('//')) {
    if (line.type !== 'note') {
      line.type = 'note'
    }
    return
  }

  // Detect transitions (check first, as they might contain "FADE IN:")
  // Check both uppercase and lowercase
  const lower = trimmed.toLowerCase()
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
    return
  }

  // Detect scene headings (English and Greek) - INT./EXT./ΕΣΩ./ΕΞΩ., Int./Ext./Εσω./Εξω., int./ext./εσω./εξω.
  if (upper.startsWith('INT.') || upper.startsWith('EXT.') || 
      upper.startsWith('ΕΣΩ.') || upper.startsWith('ΕΞΩ.') ||
      trimmed.startsWith('Int.') || trimmed.startsWith('Ext.') ||
      trimmed.startsWith('Εσω.') || trimmed.startsWith('Εξω.') ||
      lower.startsWith('int.') || lower.startsWith('ext.') ||
      lower.startsWith('εσω.') || lower.startsWith('εξω.')) {
    if (line.type !== 'scene-heading') {
      line.type = 'scene-heading'
      // Scene break - update (CONT'D) status for characters below
      updateContdBelow(lineIndex)
      // Reset selected scene to highlight last scene
      store.selectedSceneId = null
    }
    return
  }
  
  // If type changed to character, update (CONT'D) status
  if (line.type === 'character' && previousType !== 'character') {
    updateContdStatus(lineId, lineIndex)
  }
}

// Handle keyboard events
const handleKeyDown = (event, line, index) => {
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

  // Enter key - always split line at cursor position (split line philosophy)
  if (event.key === 'Enter') {
    event.preventDefault()

    const selection = window.getSelection()
    if (!selection.rangeCount) return

    const range = selection.getRangeAt(0)
    const currentElement = event.target
    const currentText = currentElement.innerText || currentElement.textContent || ''
    
    // Get accurate cursor position in contenteditable
    // Create a range from start of element to cursor position
    const preRange = range.cloneRange()
    preRange.selectNodeContents(currentElement)
    preRange.setEnd(range.startContainer, range.startOffset)
    const cursorPosition = preRange.toString().length

    // Check if cursor is at the start of the first line (start of script)
    if (index === 0 && cursorPosition === 0 && currentText.length === 0) {
      // Move whole script one line down by inserting empty line at start
      store.pushToHistory()
      const emptyLine = { id: uuidv4(), type: 'action', content: '' }
      store.activeProject.lines.unshift(emptyLine)
      store.activeProject.updatedAt = Date.now()
      
      nextTick(() => {
        const firstElement = lineRefs.value[0]
        if (firstElement) {
          firstElement.focus()
        }
      })
      return
    }

    // Special handling for scene heading: if entering from start, push whole script down
    if (line.type === 'scene-heading' && cursorPosition === 0) {
      // Insert empty line above the scene heading (push script down)
      store.pushToHistory()
      const emptyLine = { id: uuidv4(), type: 'action', content: '' }
      store.activeProject.lines.splice(index, 0, emptyLine)
      store.activeProject.updatedAt = Date.now()
      
      // Scene break - update (CONT'D) status for characters below
      updateContdBelow(index)
      
      nextTick(() => {
        const newElement = lineRefs.value[index]
        if (newElement) {
          newElement.focus()
        }
      })
      return
    }

    // Always split the line at cursor position (split line philosophy)
    const beforeText = currentText.substring(0, cursorPosition)
    const afterText = currentText.substring(cursorPosition)

    // Update current line with text before cursor
    store.updateLine(line.id, beforeText)

    // Determine type for new line
    let nextType
    if (isBookFormat.value) {
      // For Book format, always create body-text paragraphs
      nextType = 'body-text'
    } else if (line.type === 'scene-heading') {
      // If splitting scene heading, make split text action
      nextType = 'action'
    } else {
      nextType = getNextLineType(line.type)
    }

    // Insert new line and move the split text to it
    const newLine = store.addLine(line.id, nextType)
    
    // Set the split text on the new line
    store.updateLine(newLine.id, afterText)
    
    // If new line is character type, update (CONT'D) status
    if (nextType === 'character') {
      nextTick(() => {
        updateContdStatus(newLine.id, index + 1)
      })
    }

    nextTick(() => {
      const nextElement = lineRefs.value[index + 1]
      if (nextElement) {
        // Ensure the text is set in the DOM
        // Note: scene number will be added automatically by the display logic
        if (afterText.length > 0) {
          nextElement.innerText = afterText
        }
        nextElement.focus()
        // Move cursor to start of new line where the split text is
        moveCursorToStart(nextElement)
      }
    })
  }

  // Tab key - cycle line type
  else if (event.key === 'Tab') {
    event.preventDefault()
    cycleLineType(line.id, line.type)
  }

  // Backspace at start of line - delete empty line above or merge with previous
  else if (event.key === 'Backspace') {
    const selection = window.getSelection()
    if (!selection.rangeCount) return
    
    const range = selection.getRangeAt(0)
    const currentElement = event.target
    const currentText = currentElement.innerText || currentElement.textContent || ''
    
    // Get accurate cursor position
    const preRange = range.cloneRange()
    preRange.selectNodeContents(currentElement)
    preRange.setEnd(range.startContainer, range.startOffset)
    const cursorPosition = preRange.toString().length

    // Only handle if at start of line and not first line
    if (cursorPosition === 0 && index > 0) {
      event.preventDefault()
      
      const previousLine = lines.value[index - 1]
      const previousText = previousLine.content.trim()
      
      // If previous line is empty, delete it
      if (previousText.length === 0) {
        store.pushToHistory()
        store.deleteLine(previousLine.id)
        
        nextTick(() => {
          const currentElementAfter = lineRefs.value[index - 1]
          if (currentElementAfter) {
            currentElementAfter.focus()
            moveCursorToStart(currentElementAfter)
          }
        })
      } else {
        // Previous line is not empty, merge with it
        mergeWithPreviousLine(line.id, index)
      }
    }
  }

  // Arrow keys - navigate between lines
  else if (event.key === 'ArrowUp' && index > 0) {
    const selection = window.getSelection()
    const range = selection.getRangeAt(0)

    if (range.startOffset === 0) {
      event.preventDefault()
      const prevElement = lineRefs.value[index - 1]
      if (prevElement) {
        prevElement.focus()
        moveCursorToEnd(prevElement)
      }
    }
  } else if (event.key === 'ArrowDown' && index < lines.value.length - 1) {
    const selection = window.getSelection()
    const range = selection.getRangeAt(0)
    const content = event.target.innerText

    if (range.startOffset === content.length) {
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

// Handle click on editor (outside lines)
const handleEditorClick = (event) => {
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

// Handle global mouse move for cross-line selection
const handleGlobalMouseMove = (event) => {
  if (!isSelecting.value) return
  
  // Find which line element the mouse is over (use elementsFromPoint so we get .line-content even under overlay)
  let lineContent = event.target.closest('.line-content')
  if (!lineContent && document.elementsFromPoint) {
    const elements = document.elementsFromPoint(event.clientX, event.clientY)
    lineContent = elements.find((el) => el.classList && el.classList.contains('line-content'))
  }
  if (!lineContent) return
  
  // Find the line index
  const lineContainer = lineContent.closest('[data-line-index]')
  if (!lineContainer) return
  
  const lineIndex = parseInt(lineContainer.getAttribute('data-line-index'))
  if (isNaN(lineIndex)) return
  
  // If we're over a different line, update selection
  if (selectionStart.value.lineIndex !== null && lineIndex !== selectionStart.value.lineIndex) {
    const selection = window.getSelection()
    const startLine = selectionStart.value.lineIndex
    const endLine = lineIndex
    
    if (startLine !== endLine) {
      const startElement = lineRefs.value[startLine]
      const endElement = lineRefs.value[endLine]
      
      if (startElement && endElement) {
        const endOffset = getOffsetAtPoint(endElement, event.clientX, event.clientY)
        
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

    // If oldLines is null/undefined, this is an initial load or array replacement (episode switch)
    if (!oldLines || newLines !== oldLines) {
      // Array reference changed (episode switch) or initial load
      isExternalUpdate.value = true
      nextTick(() => {
        newLines.forEach((line, index) => {
          const el = lineRefs.value[index]
          if (el) {
            el.innerText = line.content || ''
          }
        })
        calculatePageBreaks()
        isExternalUpdate.value = false
        
        // Update all (CONT'D) statuses
        newLines.forEach((line, index) => {
          if (line.type === 'character') {
            updateContdStatus(line.id, index)
          }
        })
      })
      return
    }

    // Check if this is an external update (undo/redo)
    // by comparing if content changed but we didn't trigger it
    if (!isExternalUpdate.value && newLines.length === oldLines.length) {
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

// Force line type handler
const handleForceLineType = (event) => {
  const { type } = event.detail
  const currentLine = lines.value[currentLineIndex.value]
  
  if (currentLine) {
    store.pushToHistory()
    store.updateLine(currentLine.id, currentLine.content, type)
    
    // If forced to character, update (CONT'D) status
    if (type === 'character') {
      nextTick(() => {
        updateContdStatus(currentLine.id, currentLineIndex.value)
      })
    }
    
    // If forced to scene-heading, reset selected scene to highlight last scene
    if (type === 'scene-heading') {
      store.selectedSceneId = null
    }
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
    const currentLine = lines.value[currentLineIndex.value]
    if (currentLine) {
      store.pushToHistory()
      store.updateLine(currentLine.id, currentLine.content, keyMap[event.key])
      
      // If forced to scene-heading, reset selected scene to highlight last scene
      if (keyMap[event.key] === 'scene-heading') {
        store.selectedSceneId = null
      }
    }
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
    const currentLine = lines.value[currentLineIndex.value]
    if (currentLine) {
      store.pushToHistory()
      store.updateLine(currentLine.id, currentLine.content, 'chapter-title')
    }
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

// Initialize
onMounted(() => {
  // Calculate initial page breaks
  calculatePageBreaks()
  
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
})

// Cleanup
onUnmounted(() => {
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
})
</script>

<style scoped>
.editor-container {
  flex: 1;
  overflow-y: auto;
  background-color: #f0f0f0;
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  position: relative;
  transition: all 0.3s ease;
}

.editor-container.full-page-view {
  padding: 20px 10px;
}

.editor-wrapper {
  width: 100%;
  max-width: 794px; /* A4 width in pixels at 96 DPI */
  background: white;
  min-height: 1123px; /* A4 height in pixels at 96 DPI */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  padding: 72px 90px 72px 72px; /* Standard margins */
  transition: all 0.3s ease;
}

/* Book format - A4 page styling */
.script-editor.book-format .editor-wrapper {
  background: white;
  padding: 72px 90px 72px 72px; /* Standard A4 margins */
}

.editor-container.full-page-view .editor-wrapper {
  /* Keep margins the same, don't scale the wrapper */
  max-width: 100%;
}

.script-editor {
  font-family: 'Courier New', Courier, monospace;
  font-size: 12pt;
  line-height: 1.2;
  outline: none;
  min-height: 100%;
  cursor: text;
  transition: all 0.3s ease;
}

.editor-container.full-page-view .editor-wrapper {
  /* Reduce shadow in full page view (reduced by 70%) */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.045);
}

.editor-container.full-page-view .script-editor {
  /* Adjust font size to counter-balance scale, maintaining correct margins and block rules */
  font-size: 13.8pt; /* 12pt * 1.15 - scales with the view */
  transform: none; /* Remove scale transform, use font-size instead */
}

.script-line {
  position: relative;
  display: flex;
  min-height: 14.4pt;
  margin: 0;
  transition: all 0.3s ease;
}

.editor-container.full-page-view .script-line {
  min-height: 16.56pt; /* 14.4pt * 1.15 */
}

.line-content {
  flex: 1;
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  min-height: 14.4pt;
  cursor: text;
  -webkit-user-select: text;
  user-select: text;
}

.editor-container.full-page-view .line-content {
  min-height: 16.56pt; /* 14.4pt * 1.15 */
}

.line-content:empty:before {
  content: '\200B'; /* Zero-width space to maintain height */
  pointer-events: none; /* Allow clicks through the pseudo-element */
}

/* Scene heading */
.line-scene-heading {
  margin-top: 24pt;
  margin-bottom: 12pt;
}

.editor-container.full-page-view .line-scene-heading {
  margin-top: 27.6pt; /* 24pt * 1.15 */
  margin-bottom: 13.8pt; /* 12pt * 1.15 */
}

.line-scene-heading:first-child {
  margin-top: 0;
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

.editor-container.full-page-view .scene-number {
  font-size: 12.65pt; /* 11pt * 1.15 */
  left: -69px; /* -60px * 1.15 */
  width: 57.5px; /* 50px * 1.15 */
}

.editor-container.full-page-view .line-transition .line-content {
  max-width: 230px; /* 200px * 1.15 */
}

/* Action */
.line-action {
  margin-bottom: 12pt;
}

.editor-container.full-page-view .line-action {
  margin-bottom: 13.8pt; /* 12pt * 1.15 */
}

/* Character */
.line-character {
  margin-left: 240px;
  margin-top: 12pt;
}

.editor-container.full-page-view .line-character {
  margin-left: 276px; /* 240px * 1.15 */
  margin-top: 13.8pt; /* 12pt * 1.15 */
}

.line-character .line-content {
  text-transform: uppercase;
}

/* Dialogue */
.line-dialogue {
  margin-left: 156px;
  margin-right: 156px;
  margin-bottom: 12pt;
}

.editor-container.full-page-view .line-dialogue {
  margin-left: 179.4px; /* 156px * 1.15 */
  margin-right: 179.4px; /* 156px * 1.15 */
  margin-bottom: 13.8pt; /* 12pt * 1.15 */
}

/* Parenthetical */
.line-parenthetical {
  margin-left: 204px;
  margin-right: 204px;
}

.editor-container.full-page-view .line-parenthetical {
  margin-left: 234.6px; /* 204px * 1.15 */
  margin-right: 234.6px; /* 204px * 1.15 */
}

.line-parenthetical .line-content {
  font-style: italic;
}

/* Transition */
.line-transition {
  margin-top: 12pt;
  margin-bottom: 12pt;
  justify-content: flex-end;
}

.editor-container.full-page-view .line-transition {
  margin-top: 13.8pt; /* 12pt * 1.15 */
  margin-bottom: 13.8pt; /* 12pt * 1.15 */
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
  margin-bottom: 0;
  text-indent: 1.5em; /* First line indent */
  text-align: justify;
}

.line-body-text .line-content {
  text-align: justify;
}

/* Chapter title */
.line-chapter-title {
  page-break-before: always;
  margin-top: 60px;
  margin-bottom: 40px;
  text-align: center;
}

.line-chapter-title:first-child {
  page-break-before: auto;
  margin-top: 0;
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
  background: #1e1e1e;
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
</style>
