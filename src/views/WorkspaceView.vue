<!-- src/views/WorkspaceView.vue - ENHANCED -->
<template>
  <div class="app-container" :class="{ 'focus-mode': focusMode }">
    <AppHeader :isMobile="isMobile" @open-about="showAboutDialog = true" />

    <!-- Auto-save indicator -->
    <div v-if="lastSaved" class="autosave-indicator">
      <i class="pi pi-check-circle"></i>
      Saved {{ formatTime(lastSaved) }}
    </div>

    <!-- Mobile backdrop when sidebar/drawer or popup is open -->
    <div
      v-if="isMobile && (store.sceneNavVisible || store.episodeNavVisible)"
      class="mobile-sidebar-backdrop"
      @click="closeMobileSidebars"
    />

    <!-- Mobile: Scenes & Characters as centered popup -->
    <div
      v-if="isMobile && store.sceneNavVisible"
      class="scenes-popup-overlay"
      @click.self="closeMobileSidebars"
    >
      <div class="scenes-popup">
        <div class="scenes-popup-header">
          <h3 class="scenes-popup-title">Scenes & Characters</h3>
          <button class="scenes-popup-close" @click="closeMobileSidebars" aria-label="Close">×</button>
        </div>
        <div class="scenes-popup-body">
          <SideBar
            class="scenes-popup-sidebar"
            @scene-selected="onSceneSelectedFromPopup"
            @find-character="onFindCharacterFromPopup"
          />
        </div>
      </div>
    </div>

    <div class="main-content">
      <!-- Left Sidebar - Scenes & Characters (desktop only) -->
      <SideBar
        v-if="!isMobile && store.sceneNavVisible"
        @scene-selected="scrollToScene"
        @find-character="findCharacter"
      />

      <!-- Main Editor -->
      <main class="editor-area">
        <!-- Formatting Toolbar -->
        <div class="formatting-toolbar-wrapper">
          <button
            class="formatting-toolbar-toggle-minimal"
            @click="toggleFormattingToolbar"
            title="Toggle formatting toolbar"
          >
            <span class="arrow-minimal"></span>
          </button>
          <div v-if="showFormattingToolbar" class="formatting-toolbar">
            <button
              class="toolbar-btn"
              :class="{ active: isBold }"
              @click="applyFormatting('bold')"
              title="Bold (Cmd+B)"
            >
              <strong>B</strong>
            </button>
            <button
              class="toolbar-btn"
              :class="{ active: isItalic }"
              @click="applyFormatting('italic')"
              title="Italic (Cmd+I)"
            >
              <em>I</em>
            </button>
            <button
              class="toolbar-btn"
              :class="{ active: isUnderline }"
              @click="applyFormatting('underline')"
              title="Underline (Cmd+U)"
            >
              <u>U</u>
            </button>
          </div>
        </div>
        
        <!-- Floating Seasons Toggle Button (TV Show only) -->
        <button
          v-if="isTVShow"
          class="seasons-toggle-button"
          @click="store.episodeNavVisible = !store.episodeNavVisible"
          title="Toggle Seasons"
        >
          <span class="arrow-icon">{{ store.episodeNavVisible ? '‹' : '›' }}</span>
        </button>
        <ScriptEditor ref="editorRef" :isMobile="isMobile" @highlight-search="handleSearchHighlight" />
      </main>

      <!-- Right Sidebar - Episodes (TV Show) -->
      <RightSidebar v-if="isTVShow" />
    </div>

    <!-- Dialogs -->
    <PDFExportDialog v-model:visible="store.showPDFDialog" />
    <PreviewDialog v-model:visible="store.showPreviewDialog" />
    <TitlePageDialog v-model:visible="store.showTitleDialog" />
    <CharacterReplaceDialog v-model:visible="store.showCharacterReplace" />
    <FindReplaceDialog
      v-model:visible="store.showFindReplace"
      :initial-mode="findReplaceMode"
      @highlight="handleSearchHighlight"
    />
    <ScriptAnalysisDialog v-model:visible="store.showScriptAnalysis" />
    <SpellGrammarDialog v-model:visible="store.showSpellGrammarDialog" />
    <TimeReminderDialog v-model:visible="store.showTimeReminder" />
    <TrainingDialog :visible="store.showTrainingDialog" @update:visible="store.showTrainingDialog = $event" />
    <ShortcutsDialog />

    <!-- About Dialog -->
    <div v-if="showAboutDialog" class="about-dialog-overlay" @click="showAboutDialog = false">
      <div class="about-dialog" @click.stop>
        <h1 class="about-title">
          ArtScript Web<span class="cursor-marker" :class="{ 'hidden': !showCursor }"></span>
        </h1>
        <h2 class="about-subtitle">About</h2>
        <div class="about-content">
          <p>This is not just a script writing program.</p>
          <p>This is the solution to your main problem: focus.</p>
          <p>This app exists to remove distractions and let you concentrate on what truly matters — the story.</p>
          <p>No clutter. No noise. No unnecessary tools.</p>
          <p>Everything you need, in one place.</p>
          <p>So you can stop managing software</p>
          <p>and start writing.</p>
        </div>
        <p class="about-footer">Created by Nick Christod</p>
        <button class="contact-creator-btn" @click="showContactDialog = true">Contact Creator</button>
        <button class="about-close-btn" @click="showAboutDialog = false">×</button>
        <button class="about-cursor-toggle" @click="showCursor = !showCursor" :title="showCursor ? 'Hide cursor' : 'Show cursor'">
          <span class="cursor-icon">|</span>
        </button>
      </div>
    </div>

    <!-- Contact Dialog -->
    <div v-if="showContactDialog" class="contact-dialog-overlay" @click="showContactDialog = false">
      <div class="contact-dialog" @click.stop>
        <h2 class="contact-dialog-title">Contact Creator</h2>
        <form @submit.prevent="sendEmail" class="contact-form">
          <div class="form-group">
            <label for="user-email">Your Email <span class="required">*</span></label>
            <input
              id="user-email"
              type="email"
              v-model="contactForm.userEmail"
              required
              placeholder="your.email@example.com"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="email-title">Subject <span class="required">*</span></label>
            <input
              id="email-title"
              type="text"
              v-model="contactForm.title"
              required
              placeholder="Enter subject"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="email-message">Message <span class="required">*</span></label>
            <textarea
              id="email-message"
              v-model="contactForm.message"
              required
              placeholder="Enter your message"
              rows="6"
              class="form-textarea"
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="form-btn cancel-btn" @click="showContactDialog = false">Cancel</button>
            <button type="submit" class="form-btn submit-btn" :disabled="isSendingEmail">
              {{ isSendingEmail ? 'Sending...' : 'Send' }}
            </button>
          </div>
        </form>
        <button class="contact-close-btn" @click="showContactDialog = false">×</button>
      </div>
    </div>

    <!-- Hidden file input for keyboard shortcut -->
    <input
      type="file"
      id="hidden-file-input"
      ref="fileInput"
      @change="handleImport"
      style="display: none"
      :accept="isMobile ? 'application/json,text/plain,.asxpro,.fountain,.fnt' : '.asxpro,.fountain'"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useAutoSave } from '@/composables/useAutoSave'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

import AppHeader from '@/components/layout/AppHeader.vue'
import SideBar from '@/components/layout/SideBar.vue'
import RightSidebar from '@/components/layout/RightSideBar.vue'
import ScriptEditor from '@/components/editor/ScriptEditor.vue'

import PDFExportDialog from '@/components/dialogs/PDFExportDialog.vue'
import PreviewDialog from '@/components/dialogs/PreviewDialog.vue'
import TitlePageDialog from '@/components/dialogs/TitlePageDialog.vue'
import CharacterReplaceDialog from '@/components/dialogs/CharacterReplaceDialog.vue'
import FindReplaceDialog from '@/components/dialogs/FindReplaceDialog.vue'
import ScriptAnalysisDialog from '@/components/dialogs/ScriptAnalysisDialog.vue'
import SpellGrammarDialog from '@/components/dialogs/SpellGrammarDialog.vue'
import TimeReminderDialog from '@/components/dialogs/TimeReminderDialog.vue'
import TrainingDialog from '@/components/dialogs/TrainingDialog.vue'
import ShortcutsDialog from '@/components/dialogs/ShortcutsDialog.vue'
// Character panel is now inside SideBar (Scenes | Characters tabs)

const store = useProjectStore()
const editorRef = ref(null)
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < 768)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const closeMobileSidebars = () => {
  store.sceneNavVisible = false
  store.episodeNavVisible = false
}
const fileInput = ref(null)
const focusMode = ref(false)
const findReplaceMode = ref('find')
const showFormattingToolbar = ref(false)
const isBold = ref(false)
const isItalic = ref(false)
const isUnderline = ref(false)
const showAboutDialog = ref(false)
const showCursor = ref(true)
const showContactDialog = ref(false)
const isSendingEmail = ref(false)
const contactForm = ref({
  userEmail: '',
  title: '',
  message: ''
})

// Toggle formatting toolbar
const toggleFormattingToolbar = () => {
  showFormattingToolbar.value = !showFormattingToolbar.value
}

// Apply formatting
const applyFormatting = (format) => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    // If no selection, try to get the current cursor position
    const activeElement = document.activeElement
    if (activeElement && activeElement.contentEditable === 'true' && activeElement.classList.contains('line-content')) {
      // Select all text in the current line
      const range = document.createRange()
      range.selectNodeContents(activeElement)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      return
    }
  }
  
  document.execCommand(format, false, null)
  
  // Update formatting state
  nextTick(() => {
    checkFormattingState()
  })
}

// Handle keyboard shortcuts for formatting
const handleFormattingShortcuts = (event) => {
  const target = event.target
  const isContentEditable = target.contentEditable === 'true'
  if (!isContentEditable) return

  if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
    if (event.key === 'b' || event.key === 'B') {
      event.preventDefault()
      applyFormatting('bold')
      return
    }
    if (event.key === 'i' || event.key === 'I') {
      event.preventDefault()
      applyFormatting('italic')
      return
    }
    if (event.key === 'u' || event.key === 'U') {
      event.preventDefault()
      applyFormatting('underline')
      return
    }
  }
}

// Check formatting state
const checkFormattingState = () => {
  if (!showFormattingToolbar.value) return
  
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    isBold.value = false
    isItalic.value = false
    isUnderline.value = false
    return
  }
  
  isBold.value = document.queryCommandState('bold')
  isItalic.value = document.queryCommandState('italic')
  isUnderline.value = document.queryCommandState('underline')
}

// Handle selection changes
const handleSelectionChange = () => {
  if (showFormattingToolbar.value) {
    nextTick(() => {
      checkFormattingState()
    })
  }
}

// Initialize auto-save
const { lastSaved } = useAutoSave()

// Initialize keyboard shortcuts
useKeyboardShortcuts()

// Only show right sidebar if format is TV Show
const isTVShow = computed(() => store.activeProject?.format === 'TV Show')

// Event listeners for legacy support
const openPDF = () => (store.showPDFDialog = true)
const openTitle = () => (store.showTitleDialog = true)
const openFindReplace = (e) => {
  findReplaceMode.value = e.detail?.mode || 'find'
  store.showFindReplace = true
}

// Scroll to scene
const scrollToScene = (sceneIndex) => {
  window.dispatchEvent(new CustomEvent('scroll-to-scene', { detail: { lineIndex: sceneIndex } }))
}

// Mobile popup: close when scene selected (SideBar dispatches scroll-to-scene globally)
const onSceneSelectedFromPopup = () => {
  closeMobileSidebars()
}

// Mobile popup: find character and close
const onFindCharacterFromPopup = (characterName) => {
  findCharacter(characterName)
  closeMobileSidebars()
}

// Find character in script
const findCharacter = (characterName) => {
  findReplaceMode.value = 'find'
  store.showFindReplace = true

  // Pre-fill search with character name
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent('prefill-search', {
        detail: { text: characterName },
      }),
    )
  }, 100)
}

// Handle search highlighting
const handleSearchHighlight = (highlight) => {
  if (!highlight) return

  // Implementation to highlight text in editor
  console.log('Highlight:', highlight)
}

// Format time helper
const formatTime = (date) => {
  if (!date) return ''
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleDateString()
}

// Handle file import
const handleImport = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  const text = await file.text()
  const fileName = file.name.toLowerCase()
  
  let id
  if (fileName.endsWith('.fountain')) {
    id = store.importProjectFromFountain(text, file.name)
  } else {
    id = store.importProjectFromJSON(text, file.name)
  }

  if (id) {
    store.saveToRecentProjects(id)
    router.push(`/project/${id}`)
  }

  // Reset input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Handle focus mode toggle
const toggleFocusMode = () => {
  focusMode.value = !focusMode.value
}

// Send email using mailto (fallback) or EmailJS
const sendEmail = async () => {
  if (!contactForm.value.userEmail || !contactForm.value.title || !contactForm.value.message) {
    return
  }

  isSendingEmail.value = true

  try {
    // Use mailto as a fallback - opens user's email client
    const recipient = 'nickchristod98@gmail.com'
    const subject = encodeURIComponent(contactForm.value.title)
    const body = encodeURIComponent(
      `From: ${contactForm.value.userEmail}\n\n${contactForm.value.message}`
    )
    const mailtoLink = `mailto:${recipient}?subject=${subject}&body=${body}`
    
    // Open mailto link
    window.location.href = mailtoLink
    
    // Reset form after a delay
    setTimeout(() => {
      contactForm.value = {
        userEmail: '',
        title: '',
        message: ''
      }
      isSendingEmail.value = false
      showContactDialog.value = false
    }, 1000)
  } catch (error) {
    console.error('Error sending email:', error)
    isSendingEmail.value = false
    alert('There was an error. Please try using your email client directly.')
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  if (isMobile.value) {
    store.sceneNavVisible = false
    store.episodeNavVisible = false
  }

  window.addEventListener('open-pdf-dialog', openPDF)
  window.addEventListener('open-title-dialog', openTitle)
  window.addEventListener('open-find-replace', openFindReplace)
  
  // Listen for selection changes
  document.addEventListener('selectionchange', handleSelectionChange)
  document.addEventListener('mouseup', handleSelectionChange)
  
  // Listen for formatting shortcuts
  document.addEventListener('keydown', handleFormattingShortcuts)

  document.body.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
      e.preventDefault()
      toggleFocusMode()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('open-pdf-dialog', openPDF)
  window.removeEventListener('open-title-dialog', openTitle)
  window.removeEventListener('open-find-replace', openFindReplace)
  document.removeEventListener('selectionchange', handleSelectionChange)
  document.removeEventListener('mouseup', handleSelectionChange)
  document.removeEventListener('keydown', handleFormattingShortcuts)
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  transition: all 0.3s ease;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.editor-area {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  justify-content: center;
}

.autosave-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(40, 167, 69, 0.95);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  animation: fadeInOut 2s ease-in-out;
  pointer-events: none;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  10% {
    opacity: 1;
    transform: translateY(0);
  }
  90% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(10px);
  }
}

/* Focus Mode */
.app-container.focus-mode :deep(.toolbar-container),
.app-container.focus-mode :deep(.scene-navigation),
.app-container.focus-mode :deep(.character-manager),
.app-container.focus-mode :deep(.episode-navigation) {
  display: none;
}

/* Formatting Toolbar */
.formatting-toolbar-wrapper {
  position: absolute;
  top: 0;
  left: calc(50% - 80px);
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.formatting-toolbar-toggle-minimal {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  opacity: 0.8;
  margin-bottom: 2px;
}

.formatting-toolbar-toggle-minimal:hover {
  opacity: 1;
}

.arrow-minimal {
  display: block;
  width: 20px;
  height: 1.5px;
  background: #555;
  transition: all 0.2s;
}

.formatting-toolbar-toggle-minimal:hover .arrow-minimal {
  width: 24px;
  background: #333;
}

:global(body.dark-mode) .arrow-minimal {
  background: #bbb;
}

:global(body.dark-mode) .formatting-toolbar-toggle-minimal:hover .arrow-minimal {
  background: #ddd;
}

.formatting-toolbar {
  display: flex;
  gap: 2px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:global(body.dark-mode) .formatting-toolbar {
  background: #2a2a2a;
  border-color: #555;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.toolbar-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #333;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #f0f0f0;
}

:global(body.dark-mode) .toolbar-btn {
  color: #e0e0e0;
}

:global(body.dark-mode) .toolbar-btn:hover {
  background: #444;
}

.toolbar-btn.active {
  background: #e3f2fd;
  color: #1976d2;
}

:global(body.dark-mode) .toolbar-btn.active {
  background: #1e3a5f;
  color: #64b5f6;
}

.toolbar-btn strong {
  font-weight: bold;
}

.toolbar-btn em {
  font-style: italic;
}

.toolbar-btn u {
  text-decoration: underline;
}

.app-container.focus-mode .editor-area {
  background: #f5f5f5;
  padding: 60px 20px;
}

:global(body.dark-mode) .app-container.focus-mode .editor-area {
  background: #1a1a1a;
}

/* Floating Seasons Toggle Button */
.seasons-toggle-button {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.seasons-toggle-button:hover {
  background: #f5f5f5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.seasons-toggle-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.arrow-icon {
  font-size: 16px;
  color: #555;
  font-weight: 500;
  line-height: 1;
}

:global(body.dark-mode) .seasons-toggle-button {
  background: #2a2a2a;
  border-color: #444;
}

:global(body.dark-mode) .seasons-toggle-button:hover {
  background: #333;
}

:global(body.dark-mode) .arrow-icon {
  color: #ccc;
}
</style>
