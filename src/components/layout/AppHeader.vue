<!-- src/components/layout/AppHeader.vue - ENHANCED -->
<template>
  <div class="toolbar-container">
    <header class="toolbar">
      <div class="toolbar-left">
        <!-- File Menu -->
        <div class="dropdown" :class="{ active: isFileMenuOpen }" @click.stop="toggleFileMenu">
          <button class="icon-btn dropdown-btn" title="File Menu" @click.stop="toggleFileMenu">
            <span class="hamburger-icon"> <span></span><span></span><span></span> </span>
          </button>

          <div class="dropdown-menu" v-if="isFileMenuOpen">
            <div class="dropdown-item-with-submenu">
              <button class="dropdown-item" @click.stop><i class="pi pi-plus"></i> New <i class="pi pi-angle-right" style="float: right; margin-top: 2px;"></i></button>
              <div class="dropdown-submenu">
                <button class="dropdown-item" @click="createNewProject('Film')">
                  <i class="pi pi-video"></i> Film
                </button>
                <button class="dropdown-item" @click="createNewProject('TV Show')">
                  <i class="pi pi-desktop"></i> TV Show
                </button>
                <button
                  class="dropdown-item dropdown-item-coming-soon"
                  title="Book format coming soon"
                  @click="showBookComingSoon = true; isFileMenuOpen = false"
                >
                  <i class="pi pi-book"></i> Book
                </button>
              </div>
            </div>
            <button class="dropdown-item" @click="emitOpen">
              <i class="pi pi-folder-open"></i> Open
            </button>
            <div class="dropdown-item-with-submenu">
              <button class="dropdown-item" @click.stop>
                <i class="pi pi-save"></i> Save as..
                <i class="pi pi-angle-right" style="float: right; margin-top: 2px;"></i>
              </button>
              <div class="dropdown-submenu">
                <button
                  class="dropdown-item dropdown-item-asxpro-pro"
                  title=".asxpro coming soon"
                  @click="openAsxproProPopup"
                >
                  <span>.asxpro</span>
                  <span class="asxpro-pro-badge">pro</span>
                </button>
                <button class="dropdown-item" @click="saveAsFountain">
                  .fountain
                </button>
              </div>
            </div>

            <div class="dropdown-divider"></div>

            <button class="dropdown-item" @click="store.showTitleDialog = true">
              <i class="pi pi-file"></i> Title Page
            </button>

            <div class="dropdown-divider"></div>

            <button class="dropdown-item" @click="store.showPDFDialog = true">
              <i class="pi pi-file-pdf"></i> Export PDF
            </button>

            <div class="dropdown-divider"></div>

            <!-- Mobile: View & Navigation (dark, sidebars, undo) - Full Page View hidden on mobile -->
            <template v-if="props.isMobile">
              <button class="dropdown-item" @click="store.toggleDarkMode(); isFileMenuOpen = false">
                <i class="pi pi-moon"></i>
                {{ store.darkMode ? 'Light Mode' : 'Dark Mode' }}
              </button>
              <button class="dropdown-item" @click="store.sceneNavVisible = !store.sceneNavVisible; isFileMenuOpen = false">
                <i class="pi pi-list"></i>
                {{ store.sceneNavVisible ? 'Hide' : 'Show' }} Scenes & Characters
              </button>
              <button
                v-if="isTVShow"
                class="dropdown-item"
                @click="store.episodeNavVisible = !store.episodeNavVisible; isFileMenuOpen = false"
              >
                <i class="pi pi-th-large"></i>
                {{ store.episodeNavVisible ? 'Hide' : 'Show' }} Episodes
              </button>
              <button
                class="dropdown-item"
                :disabled="!store.canUndo()"
                @click="store.undo(); isFileMenuOpen = false"
              >
                <i class="pi pi-undo"></i> Undo
              </button>
              <div class="dropdown-divider"></div>
            </template>

            <!-- Force Element Type -->
            <div class="dropdown-item-with-submenu">
              <button class="dropdown-item" @click.stop>
                <i class="pi pi-bolt"></i> Force.. 
                <i class="pi pi-angle-right" style="float: right; margin-top: 2px;"></i>
              </button>
              <div class="dropdown-submenu">
                <button class="dropdown-item" @click="forceLineType('scene-heading')">
                  <span>Force Scene Heading</span>
                  <span class="shortcut-hint">Ctrl+1</span>
                </button>
                <button class="dropdown-item" @click="forceLineType('action')">
                  <span>Force Action</span>
                  <span class="shortcut-hint">Ctrl+2</span>
                </button>
                <button class="dropdown-item" @click="forceLineType('character')">
                  <span>Force Character</span>
                  <span class="shortcut-hint">Ctrl+3</span>
                </button>
                <button class="dropdown-item" @click="forceLineType('dialogue')">
                  <span>Force Dialogue</span>
                  <span class="shortcut-hint">Ctrl+4</span>
                </button>
                <button class="dropdown-item" @click="forceLineType('transition')">
                  <span>Force Transition</span>
                  <span class="shortcut-hint">Ctrl+5</span>
                </button>
              </div>
            </div>

            <!-- Tools submenu -->
            <div class="dropdown-item-with-submenu">
              <button class="dropdown-item" @click.stop>
                <i class="pi pi-cog"></i> Tools
                <i class="pi pi-angle-right" style="float: right; margin-top: 2px;"></i>
              </button>
              <div class="dropdown-submenu">
                <p v-if="props.isMobile" class="dropdown-mobile-note">Tools only available on desktop</p>
                <button
                  class="dropdown-item"
                  :class="{ 'dropdown-item-desktop-only': props.isMobile }"
                  :disabled="props.isMobile"
                  @click="store.showTimeReminder = true; isFileMenuOpen = false"
                >
                  <i class="pi pi-clock"></i> Time Reminder
                </button>
                <button
                  class="dropdown-item"
                  :class="{ 'dropdown-item-desktop-only': props.isMobile }"
                  :disabled="props.isMobile"
                  @click="openFindReplace('find'); isFileMenuOpen = false"
                >
                  <i class="pi pi-search"></i> Find (Ctrl+F)
                </button>
                <button
                  class="dropdown-item"
                  :class="{ 'dropdown-item-desktop-only': props.isMobile }"
                  :disabled="props.isMobile"
                  @click="openFindReplace('replace'); isFileMenuOpen = false"
                >
                  <i class="pi pi-replay"></i> Replace (Ctrl+H)
                </button>
                <button
                  class="dropdown-item"
                  :class="{ 'dropdown-item-desktop-only': props.isMobile }"
                  :disabled="props.isMobile"
                  @click="store.showCharacterReplace = true; isFileMenuOpen = false"
                >
                  <i class="pi pi-user-edit"></i> Replace Character
                </button>
                <button
                  class="dropdown-item"
                  :class="{ 'dropdown-item-desktop-only': props.isMobile }"
                  :disabled="props.isMobile"
                  @click="store.showScriptAnalysis = true; isFileMenuOpen = false"
                >
                  <i class="pi pi-chart-bar"></i> Script Analysis
                </button>
                <button class="dropdown-item" @click="store.showSpellGrammarDialog = true; isFileMenuOpen = false">
                  <i class="pi pi-check-circle"></i> Spell & Grammar
                </button>
              </div>
            </div>

            <div class="dropdown-divider"></div>

            <button class="dropdown-item dropdown-item-disabled" disabled>
              <i class="pi pi-book"></i> Training
            </button>
            <button v-if="!props.isMobile" class="dropdown-item" @click="showShortcuts">
              <i class="pi pi-question-circle"></i> Keyboard Shortcuts (Ctrl+/)
            </button>
          </div>
        </div>

        <!-- Scene Navigator Toggle (hidden on mobile - in dropdown) -->
        <button
          v-if="!props.isMobile"
          class="icon-btn"
          :class="{ active: store.sceneNavVisible }"
          title="Toggle Scene Navigator (Ctrl+\)"
          @click="store.sceneNavVisible = !store.sceneNavVisible"
        >
          <span class="file-icon">
            <span class="file-icon-lines"></span>
            <span class="file-icon-lines"></span>
            <span class="file-icon-lines"></span>
          </span>
        </button>

        <!-- Spell check toggle (hidden on mobile) -->
        <button
          v-if="!props.isMobile"
          class="icon-btn"
          :class="{ active: store.spellCheckEnabled }"
          :title="store.spellCheckEnabled ? 'Spell check on' : 'Spell check off'"
          @click="store.spellCheckEnabled = !store.spellCheckEnabled"
        >
          <i class="pi pi-check" style="font-size: 0.9rem;"></i>
        </button>

        <h1 class="app-title-inline clickable-title" @click="$emit('open-about')">ArtScript Web</h1>

        <!-- Undo/Redo (hidden on mobile - in dropdown) -->
        <div v-if="!props.isMobile" class="undo-redo-group">
          <button
            class="icon-btn"
            :disabled="!store.canUndo()"
            title="Undo (Ctrl+Z)"
            @click="store.undo()"
          >
            <i class="pi pi-undo"></i>
          </button>
          <button
            class="icon-btn"
            :disabled="!store.canRedo()"
            title="Redo (Ctrl+Shift+Z)"
            @click="store.redo()"
          >
            <i class="pi pi-redo"></i>
          </button>
        </div>
      </div>

      <div v-if="!props.isMobile" class="toolbar-center">
        <input
          v-if="store.activeProject"
          type="text"
          class="project-name-input"
          v-model="store.activeProject.name"
          spellcheck="false"
        />
      </div>

      <div v-if="!props.isMobile" class="toolbar-right">
        <!-- Stats Display (hidden on mobile) -->
        <div v-if="!props.isMobile && stats" class="stats-display">
          <span class="stat-item" title="Page count">
            <i class="pi pi-file"></i> {{ stats.pageCount }}
          </span>
          <span v-if="daysRemaining !== null" class="stat-item" :title="reminderTooltip">
            <i class="pi pi-clock"></i> {{ daysRemainingText }}
          </span>
        </div>

        <!-- Full Page View Toggle (hidden on mobile - in dropdown) -->
        <button
          v-if="!props.isMobile"
          class="icon-btn"
          :class="{ active: store.fullPageView }"
          title="Toggle Full Page View"
          @click="store.toggleFullPageView"
        >
          <i class="pi pi-eye"></i>
        </button>

        <!-- Dark Mode Toggle (hidden on mobile - in dropdown) -->
        <label v-if="!props.isMobile" class="switch">
          <input type="checkbox" :checked="store.darkMode" @change="store.toggleDarkMode" />
          <span class="slider"></span>
        </label>

        <!-- Format Display (hidden on mobile) -->
        <div v-if="!props.isMobile" class="info-text">
          <span v-if="store.activeProject">{{ store.activeProject.format }}</span>
        </div>
      </div>
    </header>

    <TabBar />

    <!-- Book format coming soon popup -->
    <div v-if="showBookComingSoon" class="book-coming-soon-overlay" @click.self="showBookComingSoon = false">
      <div class="book-coming-soon-dialog">
        <h2 class="book-coming-soon-title">ArtScript <strong>Book</strong></h2>
        <p class="book-coming-soon-text">
          Book format is coming soon. You will be able to write long-form prose with chapters and body text. For now, use Film or TV Show for screenplay projects.
        </p>
        <button type="button" class="book-coming-soon-close" @click="showBookComingSoon = false">OK</button>
      </div>
    </div>

    <!-- .asxpro Pro coming soon popup -->
    <div v-if="showAsxproProPopup" class="book-coming-soon-overlay" @click.self="showAsxproProPopup = false">
      <div class="book-coming-soon-dialog">
        <h2 class="book-coming-soon-title">ArtScript <strong class="asxpro-title-clickable" @click.stop="openAsxproCodePopup">.asxpro</strong></h2>
        <p class="book-coming-soon-text">
          The .asxpro extension lets you save whole episodes and seasons of a show in one project. It's coming very soon to the Pro version.
        </p>
        <button type="button" class="book-coming-soon-close" @click="showAsxproProPopup = false">OK</button>
      </div>
    </div>

    <!-- Secret code popup for .asxpro save -->
    <div v-if="showAsxproCodePopup" class="book-coming-soon-overlay" @click.self="closeAsxproCodePopup">
      <div class="book-coming-soon-dialog asxpro-code-dialog">
        <h2 class="book-coming-soon-title asxpro-code-title">
          <i class="pi pi-lock"></i>
        </h2>
        <input
          v-model="asxproCodeInput"
          type="password"
          class="asxpro-code-input"
          placeholder="Code"
          @keyup.enter="submitAsxproCode"
        />
        <p v-if="asxproCodeError" class="asxpro-code-error">{{ asxproCodeError }}</p>
        <div class="asxpro-code-actions">
          <button type="button" class="asxpro-code-cancel" @click="closeAsxproCodePopup">Cancel</button>
          <button type="button" class="book-coming-soon-close asxpro-code-submit" @click="submitAsxproCode">Unlock</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useRouter } from 'vue-router'
import TabBar from './TabBar.vue'

const props = defineProps({
  isMobile: { type: Boolean, default: false },
})

const store = useProjectStore()
const isTVShow = computed(() => store.activeProject?.format === 'TV Show')
const router = useRouter()

const isFileMenuOpen = ref(false)
const showBookComingSoon = ref(false)
const showAsxproProPopup = ref(false)
const showAsxproCodePopup = ref(false)
const asxproCodeInput = ref('')
const asxproCodeError = ref('')

const ASXPRO_SECRET_CODE = 'TV98SCRIPT6'

const stats = computed(() => store.scriptStats)

// Calculate days remaining until deadline
const daysRemaining = computed(() => {
  const deadline = store.activeProject?.deadline
  if (!deadline || !deadline.date) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const deadlineDate = new Date(deadline.date)
  deadlineDate.setHours(0, 0, 0, 0)
  
  // Only show if deadline is in the future
  if (deadlineDate <= today) return null
  
  const diffTime = deadlineDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
})

const daysRemainingText = computed(() => {
  if (daysRemaining.value === null) return ''
  if (daysRemaining.value === 0) return 'Today'
  if (daysRemaining.value === 1) return '1 day'
  return `${daysRemaining.value} days`
})

const reminderTooltip = computed(() => {
  const deadline = store.activeProject?.deadline
  if (!deadline || !deadline.date) return ''
  
  const date = new Date(deadline.date)
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  let tooltip = `Deadline: ${formattedDate}`
  if (deadline.time) {
    tooltip += ` at ${deadline.time}`
  }
  if (deadline.note) {
    tooltip += `\n${deadline.note}`
  }
  
  return tooltip
})

const toggleFileMenu = () => {
  isFileMenuOpen.value = !isFileMenuOpen.value
}

// Close menu when clicking outside
const closeMenuOnOutsideClick = (event) => {
  if (isFileMenuOpen.value && !event.target.closest('.dropdown')) {
    isFileMenuOpen.value = false
  }
}

const emitNew = () => {
  router.push('/')
  isFileMenuOpen.value = false
}

const createNewProject = (format) => {
  // Close menu immediately
  isFileMenuOpen.value = false
  
  // Use nextTick to ensure menu closes before navigation
  nextTick(() => {
    // Create project and navigate
    const id = store.createProject(format)
    store.saveToRecentProjects(id)
    router.push(`/project/${id}`)
  })
}

const emitOpen = () => {
  document.getElementById('hidden-file-input')?.click()
  isFileMenuOpen.value = false
}

const openAsxproProPopup = () => {
  showAsxproProPopup.value = true
  isFileMenuOpen.value = false
}

const openAsxproCodePopup = () => {
  showAsxproProPopup.value = false
  showAsxproCodePopup.value = true
  asxproCodeInput.value = ''
  asxproCodeError.value = ''
}

const closeAsxproCodePopup = () => {
  showAsxproCodePopup.value = false
  asxproCodeInput.value = ''
  asxproCodeError.value = ''
}

const submitAsxproCode = () => {
  if (asxproCodeInput.value.trim() === ASXPRO_SECRET_CODE) {
    store.exportProjectAsJSON()
    closeAsxproCodePopup()
  } else {
    asxproCodeError.value = 'Invalid code'
  }
}

const saveAsFountain = () => {
  store.exportToFountain()
  isFileMenuOpen.value = false
}

const openFindReplace = (mode) => {
  store.showFindReplace = true
  window.dispatchEvent(new CustomEvent('open-find-replace', { detail: { mode } }))
  isFileMenuOpen.value = false
}

const showShortcuts = () => {
  window.dispatchEvent(new CustomEvent('show-shortcuts-dialog'))
  isFileMenuOpen.value = false
}

const forceLineType = (type) => {
  window.dispatchEvent(new CustomEvent('force-line-type', { detail: { type } }))
  isFileMenuOpen.value = false
}

// Setup click outside handler
onMounted(() => {
  document.addEventListener('click', closeMenuOnOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuOnOutsideClick)
})
</script>

<style scoped>
/* Previous styles remain... */

.undo-redo-group {
  display: flex;
  gap: 4px;
  margin-left: 15px;
  padding-left: 15px;
  border-left: 1px solid #e0e0e0;
}

:global(body.dark-mode) .undo-redo-group {
  border-left-color: #444;
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.icon-btn.active {
  background: rgba(0, 0, 0, 0.08);
  border-color: #b0b0b0;
}

:global(body.dark-mode) .icon-btn.active {
  background: rgba(255, 255, 255, 0.15);
  border-color: #666;
}

.stats-display {
  display: flex;
  gap: 15px;
  font-size: 13px;
  color: #666;
  padding-right: 15px;
  border-right: 1px solid #e0e0e0;
}

:global(body.dark-mode) .stats-display {
  color: #aaa;
  border-right-color: #444;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: help;
}

.stat-item i {
  font-size: 12px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dropdown-item i {
  width: 16px;
  font-size: 14px;
  opacity: 0.7;
}

.shortcut-hint {
  color: #999;
  font-size: 12px;
  margin-left: auto;
  padding-left: 16px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  opacity: 0.7;
}

:global(body.dark-mode) .shortcut-hint {
  color: #666;
}

.dropdown-submenu .dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Disabled dropdown items */
.dropdown-item-disabled,
.dropdown-item:disabled {
  color: #999 !important;
  cursor: not-allowed;
  opacity: 0.7;
}
:global(body.dark-mode) .dropdown-item-disabled,
:global(body.dark-mode) .dropdown-item:disabled {
  color: #666 !important;
}

/* Mobile: Tools submenu - desktop-only note */
.dropdown-mobile-note {
  margin: 0;
  padding: 8px 12px 4px;
  font-size: 11px;
  color: #999;
  font-weight: 400;
}
:global(body.dark-mode) .dropdown-mobile-note {
  color: #666;
}

.dropdown-item-desktop-only {
  color: #999 !important;
}
:global(body.dark-mode) .dropdown-item-desktop-only {
  color: #666 !important;
}

/* .asxpro Pro: greyed out, coming soon */
.dropdown-item-asxpro-pro {
  color: #999 !important;
  cursor: pointer;
  opacity: 0.85;
}
.dropdown-item-asxpro-pro:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #666 !important;
}
.asxpro-pro-badge {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}
.dropdown-item-asxpro-pro:hover .asxpro-pro-badge {
  color: #666;
}
:global(body.dark-mode) .dropdown-item-asxpro-pro {
  color: #666 !important;
}
:global(body.dark-mode) .dropdown-item-asxpro-pro:hover {
  color: #888 !important;
  background: rgba(255, 255, 255, 0.06);
}
:global(body.dark-mode) .asxpro-pro-badge {
  color: #666;
}
:global(body.dark-mode) .dropdown-item-asxpro-pro:hover .asxpro-pro-badge {
  color: #888;
}

/* Book option: greyed out, coming soon */
.dropdown-item-coming-soon {
  color: #999 !important;
  cursor: pointer;
  opacity: 0.85;
}
.dropdown-item-coming-soon:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #666 !important;
}
:global(body.dark-mode) .dropdown-item-coming-soon {
  color: #666 !important;
}
:global(body.dark-mode) .dropdown-item-coming-soon:hover {
  color: #888 !important;
  background: rgba(255, 255, 255, 0.06);
}

/* Book coming soon popup */
.book-coming-soon-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.book-coming-soon-dialog {
  background: white;
  border-radius: 12px;
  padding: 24px 28px;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.book-coming-soon-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 300;
  color: #333;
  font-family: 'Montserrat', sans-serif;
}
.book-coming-soon-title strong {
  font-weight: 900;
  -webkit-text-stroke: 0.4px currentColor;
  paint-order: stroke fill;
}
.book-coming-soon-text {
  margin: 0 0 20px 0;
  font-size: 14px;
  line-height: 1.5;
  color: #555;
}
.book-coming-soon-close {
  display: block;
  width: 100%;
  padding: 10px 16px;
  font-size: 14px;
  background: #333;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.book-coming-soon-close:hover {
  background: #444;
}
:global(body.dark-mode) .book-coming-soon-dialog {
  background: #2a2a2a;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
:global(body.dark-mode) .book-coming-soon-title {
  color: #e0e0e0;
}
:global(body.dark-mode) .book-coming-soon-text {
  color: #b0b0b0;
}
/* Hidden clickable .asxpro in popup title - no visual indicator */
.asxpro-title-clickable {
  cursor: pointer;
}

/* Secret code popup */
.asxpro-code-dialog {
  max-width: 320px;
}
.asxpro-code-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.asxpro-code-title .pi {
  font-size: 24px;
}
.asxpro-code-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin: 16px 0 12px 0;
  box-sizing: border-box;
}
.asxpro-code-input:focus {
  outline: none;
  border-color: #666;
}
.asxpro-code-error {
  margin: -8px 0 12px 0;
  font-size: 13px;
  color: #c00;
}
.asxpro-code-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.asxpro-code-cancel {
  flex: 1;
  padding: 10px 16px;
  font-size: 14px;
  background: #f0f0f0;
  color: #333;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.asxpro-code-cancel:hover {
  background: #e5e5e5;
}
.asxpro-code-submit {
  flex: 1;
}
:global(body.dark-mode) .asxpro-code-input {
  background: #1a1a1a;
  border-color: #555;
  color: #e0e0e0;
}
:global(body.dark-mode) .asxpro-code-input:focus {
  border-color: #888;
}
:global(body.dark-mode) .asxpro-code-cancel {
  background: #333;
  color: #e0e0e0;
}
:global(body.dark-mode) .asxpro-code-cancel:hover {
  background: #444;
}

:global(body.dark-mode) .book-coming-soon-close {
  background: #444;
  color: #e0e0e0;
}
:global(body.dark-mode) .book-coming-soon-close:hover {
  background: #555;
}

</style>
