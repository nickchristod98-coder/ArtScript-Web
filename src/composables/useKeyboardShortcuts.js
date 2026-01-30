// src/composables/useKeyboardShortcuts.js
import { onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'

export function useKeyboardShortcuts() {
  const store = useProjectStore()

  const shortcuts = {
    // File operations
    'ctrl+s': { action: 'save', description: 'Save project' },
    'ctrl+o': { action: 'open', description: 'Open project' },
    'ctrl+n': { action: 'new', description: 'New project' },
    'ctrl+e': { action: 'export', description: 'Export PDF' },

    // Edit operations
    'ctrl+z': { action: 'undo', description: 'Undo' },
    'ctrl+shift+z': { action: 'redo', description: 'Redo' },
    'ctrl+y': { action: 'redo', description: 'Redo (alternative)' },
    'ctrl+f': { action: 'find', description: 'Find' },
    'ctrl+h': { action: 'replace', description: 'Find & Replace' },

    // View
    'ctrl+\\': { action: 'toggleSceneNav', description: 'Toggle scene navigator' },
    'ctrl+shift+c': { action: 'toggleCharacters', description: 'Toggle character panel' },
    'ctrl+shift+f': { action: 'focusMode', description: 'Focus mode' },

    // Quick element switching (Alt + Number)
    'alt+1': { action: 'setSceneHeading', description: 'Scene Heading' },
    'alt+2': { action: 'setAction', description: 'Action' },
    'alt+3': { action: 'setCharacter', description: 'Character' },
    'alt+4': { action: 'setDialogue', description: 'Dialogue' },
    'alt+5': { action: 'setParenthetical', description: 'Parenthetical' },
    'alt+6': { action: 'setTransition', description: 'Transition' },

    // Help
    'ctrl+/': { action: 'showShortcuts', description: 'Show shortcuts' },
  }

  const handleKeyDown = (event) => {
    // Don't handle shortcuts when typing in input fields (except editor)
    const target = event.target
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
    const isContentEditable = target.contentEditable === 'true'

    // Allow shortcuts in contenteditable (editor), but not in regular inputs
    if (isInput && !isContentEditable) return

    const key = []

    if (event.ctrlKey || event.metaKey) key.push('ctrl')
    if (event.shiftKey) key.push('shift')
    if (event.altKey) key.push('alt')

    // Add the actual key
    const keyName = event.key.toLowerCase()
    key.push(keyName)

    const shortcut = key.join('+')
    const command = shortcuts[shortcut]

    if (command) {
      // Check if we should prevent default
      if (shouldPreventDefault(command.action)) {
        event.preventDefault()
      }

      executeCommand(command.action, event)
    }
  }

  const shouldPreventDefault = (action) => {
    // Let browser handle undo/redo in contenteditable
    if (action === 'undo' || action === 'redo') {
      return false
    }
    // Always prevent default for our shortcuts
    return true
  }

  const executeCommand = (action, event) => {
    switch (action) {
      case 'save':
        store.exportProjectAsJSON()
        break

      case 'open':
        // Trigger file input
        document.getElementById('hidden-file-input')?.click()
        break

      case 'new':
        window.location.href = '/'
        break

      case 'export':
        store.showPDFDialog = true
        break

      case 'undo':
        store.undo()
        break

      case 'redo':
        store.redo()
        break

      case 'find':
        store.showFindReplace = true
        window.dispatchEvent(new CustomEvent('open-find-replace', { detail: { mode: 'find' } }))
        break

      case 'replace':
        store.showFindReplace = true
        window.dispatchEvent(new CustomEvent('open-find-replace', { detail: { mode: 'replace' } }))
        break

      case 'toggleSceneNav':
        store.sceneNavVisible = !store.sceneNavVisible
        break

      case 'toggleCharacters':
        store.sceneNavVisible = true
        store.sidebarView = store.sidebarView === 'characters' ? 'scenes' : 'characters'
        break

      case 'focusMode':
        document.body.classList.toggle('focus-mode')
        break

      case 'setSceneHeading':
      case 'setAction':
      case 'setCharacter':
      case 'setDialogue':
      case 'setParenthetical':
      case 'setTransition':
        const typeMap = {
          setSceneHeading: 'scene-heading',
          setAction: 'action',
          setCharacter: 'character',
          setDialogue: 'dialogue',
          setParenthetical: 'parenthetical',
          setTransition: 'transition',
        }
        window.dispatchEvent(new CustomEvent('quick-format', { detail: { type: typeMap[action] } }))
        break

      case 'showShortcuts':
        window.dispatchEvent(new CustomEvent('show-shortcuts-dialog'))
        break
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  return {
    shortcuts,
  }
}
