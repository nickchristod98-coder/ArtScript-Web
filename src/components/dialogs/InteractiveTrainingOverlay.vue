<!-- Interactive step-by-step training overlay -->
<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="interactive-training-overlay"
      :style="overlayStyle"
      @click.self="close"
    >
      <!-- Rectangular block highlight around the current line (all steps) -->
      <div
        v-if="highlightRect"
        class="training-highlight-block"
        :style="highlightBlockStyle"
        aria-hidden="true"
      />
      <div :key="currentStep" class="training-popup" :style="popupStyle" @click.stop>
        <div class="training-popup-header" v-if="!steps[currentStep]?.isFinalCongratulations">
          <span class="training-step-badge">Step {{ visibleStepNumber }} of {{ visibleStepTotal }}</span>
          <button type="button" class="training-popup-close" @click="close" title="Close">×</button>
        </div>
        <div class="training-popup-body">
          <template v-if="steps[currentStep]?.isFinalCongratulations">
            <h2 class="training-final-title">{{ steps[currentStep].finalTitle }}</h2>
            <p class="training-popup-text training-final-body">{{ steps[currentStep].text }}</p>
          </template>
          <template v-else>
            <p v-if="steps[currentStep].textHtml" class="training-popup-text" v-html="steps[currentStep].textHtml"></p>
            <p v-else class="training-popup-text">{{ steps[currentStep].text }}</p>
          </template>
        </div>
        <div class="training-popup-actions">
          <button
            v-if="currentStep > 0 && !steps[currentStep]?.isFinalCongratulations"
            type="button"
            class="training-popup-btn back"
            @click="prev"
          >
            <i class="pi pi-chevron-left"></i> Back
          </button>
          <div class="training-popup-actions-right">
            <button
              v-if="currentStep < steps.length - 1"
              type="button"
              class="training-popup-btn next"
              @click="next"
            >
              Enter <span class="enter-arrow" aria-hidden="true">↵</span>
            </button>
            <button
              v-else
              type="button"
              class="training-popup-btn done"
              @click="close"
            >
              Done <i class="pi pi-check"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'

const store = useProjectStore()

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible'])

const currentStep = ref(0)
const popupPosition = ref({ top: 100, left: 80 })
const spotlightPosition = ref({ cx: 200, cy: 200, radius: 100 })
const highlightRect = ref(null) // current line block rect (all steps)

const steps = [
  {
    lineIndex: 0,
    text: "Start with a scene heading. Type INT. or EXT. followed by the location and time, e.g. INT. COFFEE SHOP - DAY or EXT. PARK - NIGHT. The app detects it automatically.",
    textHtml: 'Start with a scene heading. Type INT. or EXT. followed by the location and time, e.g. <strong>INT. COFFEE SHOP - DAY</strong> or <strong>EXT. PARK - NIGHT</strong>. The app detects it automatically.',
  },
  {
    lineIndex: 1,
    text: "Add an action line. Describe what we see or what happens in the scene, e.g. John walks to the counter and orders a coffee.",
    textHtml: 'Add an action line. Describe what we see or what happens in the scene, e.g. <strong>John walks to the counter and orders a coffee.</strong>',
  },
  {
    lineIndex: 2,
    text: "Add a character name. Press TAB to move to the center of the page, then type the name in ALL CAPS, e.g. JOHN. The app will treat the next line as dialogue.",
    textHtml: 'Add a character name. Press <strong>TAB</strong> to move to the center of the page, then type the name in ALL CAPS, e.g. <strong>JOHN</strong>. The app will treat the next line as dialogue.',
  },
  {
    lineIndex: 3,
    text: "Write the dialogue. Type what the character says under their name. The app formats it automatically.",
    textHtml: 'Write the dialogue. Type what the character says under their name, e.g. <strong>One black coffee, please.</strong> The app formats it automatically.',
  },
  {
    lineIndex: null,
    isCongratulations: true,
    text: "CONGRATULATIONS! You just wrote your first lines of a script scene.",
    textHtml: "<strong>CONGRATULATIONS!</strong> You just wrote your first lines of a script scene.",
  },
  {
    lineIndex: null,
    uiSelector: '[data-training="episodes-sidebar-toggle"]',
    showOnlyForFormat: 'TV Show',
    text: "Toggle the Episodes sidebar. Use this button to show or hide the Seasons & Episodes panel on the right.",
    textHtml: 'Toggle the <strong>Episodes</strong> sidebar. Use this button to show or hide the Seasons & Episodes panel on the right.',
  },
  {
    lineIndex: null,
    uiSelector: '[data-training="add-episode-btn"]',
    showOnlyForFormat: 'TV Show',
    openEpisodesSidebar: true,
    popupLeftOfTarget: true,
    text: "Create an episode. Click the + next to a season to add a new episode to that season.",
    textHtml: 'Create an <strong>episode</strong>. Click the + next to a season to add a new episode to that season.',
  },
  {
    lineIndex: null,
    uiSelector: '[data-training="add-season-btn"]',
    showOnlyForFormat: 'TV Show',
    openEpisodesSidebar: true,
    popupLeftOfTarget: true,
    text: "Create a season. Click the + in the Seasons header to add a new season.",
    textHtml: 'Create a <strong>season</strong>. Click the + in the Seasons header to add a new season.',
  },
  {
    lineIndex: null,
    uiSelector: '[data-training="dark-mode"]',
    text: "Toggle dark mode. Use this switch to switch between light and dark theme.",
    textHtml: 'Toggle <strong>dark mode</strong>. Use this switch to switch between light and dark theme.',
  },
  {
    lineIndex: null,
    uiSelector: '[data-training="full-page-view"]',
    text: "Full page view. Use the eye icon to toggle between full page and standard view.",
    textHtml: '<strong>Full page view</strong>. Use the eye icon to toggle between full page and standard view.',
  },
  {
    lineIndex: null,
    uiSelector: '[data-training="spell-check"]',
    text: "Spell & Grammar. Turn spell check on or off with this button. Use the File menu for full grammar check.",
    textHtml: '<strong>Spell & Grammar</strong>. Turn spell check on or off with this button. Use the File menu for full grammar check.',
  },
  {
    lineIndex: null,
    uiSelector: '[data-training="project-title"]',
    text: "Project title. Click here to rename your project. The name appears in the tab and when you save.",
    textHtml: '<strong>Project title</strong>. Click here to rename your project. The name appears in the tab and when you save.',
  },
  {
    lineIndex: null,
    uiSelector: '[data-training="title-page-menu-item"]',
    openFileMenuForTraining: true,
    text: "Click Title Page to open the title page editor.",
    textHtml: 'Click <strong>Title Page</strong> to open the title page editor.',
  },
  {
    lineIndex: null,
    uiSelector: '[data-training="title-page-field-title"]',
    openTitlePage: true,
    text: "Enter your script title here (e.g. MY AWESOME MOVIE or the series name for TV).",
    textHtml: 'Enter your script <strong>title</strong> here (e.g. MY AWESOME MOVIE or the series name for TV).',
  },
  {
    lineIndex: null,
    titlePageFieldSelectors: ['[data-training="title-page-field-episode-title"]', '[data-training="title-page-field-credit"]'],
    showOnlyForFormat: 'TV Show',
    text: "Enter the episode title for this episode.",
    textHtml: 'Enter the <strong>episode title</strong> for this episode.',
  },
  {
    lineIndex: null,
    titlePageFieldSelectors: ['[data-training="title-page-field-credit"]', '[data-training="title-page-field-author"]'],
    text: "Enter the credit line (e.g. 'by') or your name as author.",
    textHtml: 'Enter the <strong>credit</strong> line (e.g. \'by\') or your name as <strong>author</strong>.',
  },
  {
    lineIndex: null,
    titlePageFieldSelectors: ['[data-training="title-page-field-author"]', '[data-training="title-page-field-draft"]'],
    text: "Enter the author name or draft/version (e.g. Draft 1.0).",
    textHtml: 'Enter the <strong>author</strong> name or <strong>draft/version</strong> (e.g. Draft 1.0).',
  },
  {
    lineIndex: null,
    titlePageFieldSelectors: ['[data-training="title-page-field-draft"]', '[data-training="title-page-field-contact"]'],
    text: "Enter draft/version (e.g. Draft 1.0) or your contact info.",
    textHtml: 'Enter <strong>draft/version</strong> (e.g. Draft 1.0) or your <strong>contact</strong> info.',
  },
  {
    lineIndex: null,
    uiSelector: '[data-training="title-page-field-contact"]',
    titlePageSmallCircle: true,
    text: "Enter your contact info (email, phone, or agent).",
    textHtml: 'Enter your <strong>contact</strong> info (email, phone, or agent).',
  },
  {
    lineIndex: null,
    titlePageFieldSelectors: ['[data-training="title-page-close"]', '.title-page-dialog .p-dialog-footer button'],
    titlePageCloseButton: true,
    text: "Click Close when you're done. The title page will appear when you export to PDF.",
    textHtml: 'Click <strong>Close</strong> when you\'re done. The title page will appear when you export to PDF.',
  },
  {
    lineIndex: null,
    isFinalCongratulations: true,
    finalTitle: 'Congratulations!',
    text: 'You are now a trained writer. Start your first idea and let the world know what you are really capable of.',
  },
]

/** Whether this step is visible for the current project format (Film vs TV Show) */
function shouldShowStep(index) {
  const step = steps[index]
  if (!step) return false
  if (step.showOnlyForFormat && store.activeProject?.format !== step.showOnlyForFormat) return false
  return true
}

/** Visible step number (1-based) for current step so numbering doesn't jump when steps are skipped */
const visibleStepNumber = computed(() => {
  let n = 0
  for (let i = 0; i <= currentStep.value; i++) {
    if (shouldShowStep(i)) n++
  }
  return n
})

/** Total number of visible steps for current format */
const visibleStepTotal = computed(() => {
  return steps.filter((_, i) => shouldShowStep(i)).length
})

const overlayStyle = computed(() => {
  const dim = store.darkMode ? 'rgba(0,0,0,0.65)' : 'rgba(100,100,100,0.5)'
  const step = steps[currentStep.value]
  // Congratulations or final congratulations: full dim behind the popup
  if (step?.isCongratulations || step?.isFinalCongratulations) {
    return { background: dim }
  }
  // Steps with line highlight: overlay is transparent, block draws the dim
  if (highlightRect.value) {
    return { background: 'transparent' }
  }
  // UI steps (and fallback): circle spotlight
  const { cx, cy, radius } = spotlightPosition.value
  const ring = store.darkMode ? 'rgba(74,158,255,0.25)' : 'rgba(25,118,210,0.2)'
  return {
    background: `radial-gradient(circle at ${cx}px ${cy}px, transparent ${radius - 4}px, ${ring} ${radius}px, ${dim} ${radius}px)`,
  }
})

const highlightBlockStyle = computed(() => {
  const r = highlightRect.value
  if (!r) return {}
  const dim = store.darkMode ? 'rgba(0,0,0,0.65)' : 'rgba(100,100,100,0.5)'
  const ring = store.darkMode ? 'rgba(74,158,255,0.35)' : 'rgba(25,118,210,0.3)'
  return {
    position: 'fixed',
    left: r.left + 'px',
    top: r.top + 'px',
    width: r.width + 'px',
    height: r.height + 'px',
    boxShadow: `0 0 0 2px ${ring}, 0 0 0 9999px ${dim}`,
    pointerEvents: 'none',
  }
})

const popupStyle = computed(() => ({
  top: popupPosition.value.top + 'px',
  left: popupPosition.value.left + 'px',
  transformOrigin: popupPosition.value.origin || 'top left',
}))

function getLineRect(lineIndex) {
  const el = document.querySelector(`.script-editor [data-line-index="${lineIndex}"]`)
  if (el) return el.getBoundingClientRect()
  return null
}

function focusLine(lineIndex) {
  nextTick(() => {
    const lineEl = document.querySelector(`.script-editor [data-line-index="${lineIndex}"] .line-content`)
    if (lineEl) {
      lineEl.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(lineEl)
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  })
}

const SPOTLIGHT_RADIUS = 90
const POPUP_OFFSET_RIGHT_OF_SPOTLIGHT = 20

const UI_SPOTLIGHT_RADIUS = 50
const TITLE_PAGE_FIELD_RADIUS = 76
const TITLE_PAGE_CONTACT_RADIUS = 75
const popupWidth = 320
const popupOffsetBelow = 16
const popupHeightApprox = 220

/** Small circle at the start (left) of a title page field; optional popup above for close button; optional custom radius */
function positionCircleAtStartOfElement(el, popupAbove = false, radiusOverride = null) {
  const radius = radiusOverride ?? TITLE_PAGE_FIELD_RADIUS
  if (!el) {
    popupPosition.value = { top: 100, left: (window.innerWidth - popupWidth) / 2, origin: 'top center' }
    spotlightPosition.value = { cx: window.innerWidth / 2, cy: 200, radius }
    return
  }
  const rect = el.getBoundingClientRect()
  const cx = rect.left + radius
  const cy = rect.top + rect.height / 2
  spotlightPosition.value = { cx, cy, radius }
  let top
  if (popupAbove) {
    top = Math.max(20, rect.top - popupHeightApprox - popupOffsetBelow)
  } else {
    top = rect.bottom + popupOffsetBelow
  }
  const left = Math.min(rect.right + POPUP_OFFSET_RIGHT_OF_SPOTLIGHT, window.innerWidth - popupWidth - 20)
  popupPosition.value = { top, left, origin: popupAbove ? 'bottom left' : 'top left' }
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
}

function positionCircleOnElement(el, popupBelowOnly = false) {
  const firstTwoUiSteps = currentStep.value === 8 || currentStep.value === 9
  if (el) {
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const radius = Math.max(UI_SPOTLIGHT_RADIUS, Math.max(rect.width, rect.height) / 2 + 8)
    spotlightPosition.value = { cx, cy, radius }
    const top = rect.bottom + popupOffsetBelow
    let left
    if (firstTwoUiSteps && !popupBelowOnly) {
      left = Math.max(20, rect.left - popupWidth - POPUP_OFFSET_RIGHT_OF_SPOTLIGHT)
    } else {
      left = Math.min(rect.right + POPUP_OFFSET_RIGHT_OF_SPOTLIGHT, window.innerWidth - popupWidth - 20)
    }
    popupPosition.value = {
      top,
      left,
      origin: firstTwoUiSteps && !popupBelowOnly ? 'top right' : 'top left',
    }
    el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  } else {
    popupPosition.value = { top: 100, left: (window.innerWidth - popupWidth) / 2, origin: 'top center' }
    spotlightPosition.value = { cx: window.innerWidth / 2, cy: 200, radius: UI_SPOTLIGHT_RADIUS }
  }
}

function updatePopupPosition() {
  nextTick(() => {
    const step = steps[currentStep.value]
    const lineIndex = step?.lineIndex
    const uiSelector = step?.uiSelector

    // Congratulations or final congratulations: no highlight, center the popup
    if (step?.isCongratulations || step?.isFinalCongratulations) {
      highlightRect.value = null
      const w = 320
      const h = step?.isFinalCongratulations ? 220 : 180
      popupPosition.value = {
        top: (window.innerHeight - h) / 2,
        left: (window.innerWidth - w) / 2,
        origin: 'top center',
      }
      return
    }

    // Step that opens File menu for training (Title Page button): open menu first, then position
    if (step?.openFileMenuForTraining) {
      store.openFileMenuForTraining = true
      highlightRect.value = null
      setTimeout(() => {
        const el = document.querySelector(step.uiSelector)
        positionCircleOnElement(el)
      }, 150)
      return
    }

    // TV Show: steps that need the Episodes sidebar open (add episode, add season)
    if (step?.openEpisodesSidebar) {
      store.episodeNavVisible = true
      highlightRect.value = null
      setTimeout(() => {
        const el = document.querySelector(step.uiSelector)
        if (el && step.popupLeftOfTarget) {
          const rect = el.getBoundingClientRect()
          const cx = rect.left + rect.width / 2
          const cy = rect.top + rect.height / 2
          const radius = Math.max(UI_SPOTLIGHT_RADIUS, Math.max(rect.width, rect.height) / 2 + 8)
          spotlightPosition.value = { cx, cy, radius }
          const top = rect.bottom + popupOffsetBelow
          const sidebarEl = document.querySelector('.episode-navigator')
          const sidebarLeft = sidebarEl ? sidebarEl.getBoundingClientRect().left : rect.left
          const left = Math.max(20, sidebarLeft - popupWidth - 24)
          popupPosition.value = { top, left, origin: 'top right' }
          el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
        } else {
          positionCircleOnElement(el)
        }
      }, 200)
      return
    }

    // Title page field steps: circle at start of field; close button = popup above
    const fieldSelectors = step?.titlePageFieldSelectors
    if (Array.isArray(fieldSelectors) && fieldSelectors.length) {
      let el = null
      for (const sel of fieldSelectors) {
        el = document.querySelector(sel)
        if (el) break
      }
      highlightRect.value = null
      const contactRadius = step?.titlePageSmallCircle ? TITLE_PAGE_CONTACT_RADIUS : null
      positionCircleAtStartOfElement(el, !!step?.titlePageCloseButton, contactRadius)
      return
    }

    // UI steps: circle spotlight on the target element
    if (uiSelector) {
      // Step that opens Title Page dialog and highlights first field (circle at start)
      if (step?.openTitlePage) {
        store.showTitleDialog = true
        setTimeout(() => {
          const el = document.querySelector(step.uiSelector)
          highlightRect.value = null
          positionCircleAtStartOfElement(el, false)
        }, 200)
        return
      }

      // Contact info step: smaller circle at start (same style as other title page fields)
      if (uiSelector.includes('title-page-field-contact')) {
        const el = document.querySelector(uiSelector)
        highlightRect.value = null
        positionCircleAtStartOfElement(el, false, TITLE_PAGE_CONTACT_RADIUS)
        return
      }

      const el = document.querySelector(uiSelector)
      highlightRect.value = null
      positionCircleOnElement(el)
      return
    }

    // Step 4 (dialogue): force line at index 3 to dialogue element for Film and TV Show
    if (lineIndex === 3 && store.activeProject?.lines?.[3]) {
      const line = store.activeProject.lines[3]
      if (line.type !== 'dialogue') {
        store.updateLine(line.id, line.content, 'dialogue')
      }
    }

    const rect = getLineRect(lineIndex)
    const lineContent = document.querySelector(`.script-editor [data-line-index="${lineIndex}"] .line-content`)
    const contentRect = lineContent?.getBoundingClientRect?.()

    if (rect) {
      // Same design for all steps: block highlight on current line, popup to the right
      highlightRect.value = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }
      const cx = contentRect ? contentRect.left + 28 : rect.left + 28
      const cy = contentRect ? contentRect.top + contentRect.height / 2 : rect.top + rect.height / 2
      spotlightPosition.value = { cx, cy, radius: SPOTLIGHT_RADIUS }
      const popupLeft = rect.right + POPUP_OFFSET_RIGHT_OF_SPOTLIGHT
      popupPosition.value = {
        top: rect.bottom + 12,
        left: Math.min(popupLeft, window.innerWidth - 320),
        origin: 'top left',
      }

      document.querySelector(`.script-editor [data-line-index="${lineIndex}"]`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      // Step 4 (dialogue): focus dialogue line after DOM has updated so cursor moves off character name
      if (lineIndex === 3) {
        setTimeout(() => focusLine(3), 120)
      } else {
        focusLine(lineIndex)
      }
    } else {
      highlightRect.value = null
      const editor = document.querySelector('.editor-wrapper')
      if (editor) {
        const er = editor.getBoundingClientRect()
        popupPosition.value = { top: er.top + 80, left: er.left + 40, origin: 'top left' }
        spotlightPosition.value = { cx: er.left + er.width / 2, cy: er.top + 120, radius: SPOTLIGHT_RADIUS }
      }
    }
  })
}

function next() {
  if (steps[currentStep.value]?.openFileMenuForTraining) {
    store.openFileMenuForTraining = false
  }
  if (currentStep.value >= steps.length - 1) {
    close()
    return
  }
  currentStep.value++
  while (currentStep.value < steps.length && !shouldShowStep(currentStep.value)) {
    currentStep.value++
  }
  if (currentStep.value >= steps.length) {
    close()
    return
  }
  updatePopupPosition()
}

function prev() {
  if (currentStep.value <= 0) return
  if (steps[currentStep.value]?.openFileMenuForTraining) {
    store.openFileMenuForTraining = false
  }
  currentStep.value--
  while (currentStep.value > 0 && !shouldShowStep(currentStep.value)) {
    currentStep.value--
  }
  updatePopupPosition()
}

function close() {
  store.openFileMenuForTraining = false
  emit('update:visible', false)
  store.showInteractiveTraining = false
}

function getFocusedLineIndex() {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null
  const node = sel.getRangeAt(0).startContainer
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
  const lineIndexEl = el?.closest?.('[data-line-index]')
  if (!lineIndexEl) return null
  const scriptEditor = document.querySelector('.script-editor')
  if (!scriptEditor?.contains(lineIndexEl)) return null
  const idx = parseInt(lineIndexEl.getAttribute('data-line-index'), 10)
  return isNaN(idx) ? null : idx
}

function onTrainingEnterKey(e) {
  if (!props.visible) return
  if (e.key !== 'Enter') return
  const step = steps[currentStep.value]
  if (!step) return
  if (currentStep.value >= steps.length - 1) {
    // Last step (e.g. final congratulations): Enter closes training
    e.preventDefault()
    e.stopPropagation()
    close()
    return
  }
  // Line steps (editor): only advance when focus is on that line
  if (step.lineIndex != null) {
    const focusedIndex = getFocusedLineIndex()
    if (focusedIndex !== step.lineIndex) return
  }
  e.preventDefault()
  e.stopPropagation()
  next()
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      currentStep.value = 0
      ensureDemoLines()
      nextTick(() => {
        updatePopupPosition()
        setTimeout(updatePopupPosition, 150)
        setTimeout(() => focusLine(steps[0].lineIndex), 300)
      })
      document.addEventListener('keydown', onTrainingEnterKey, true)
    } else {
      document.removeEventListener('keydown', onTrainingEnterKey, true)
    }
  }
)

// Advance when user clicks Title Page menu item (step 12 = "Click Title Page...") or Close in title page (step 19)
const TITLE_PAGE_MENU_STEP_INDEX = 12
const TITLE_PAGE_CLOSE_STEP_INDEX = 19
watch(
  () => store.showTitleDialog,
  (isOpen, wasOpen) => {
    if (!props.visible) return
    if (isOpen && !wasOpen && currentStep.value === TITLE_PAGE_MENU_STEP_INDEX) {
      next()
    }
    if (!isOpen && wasOpen && currentStep.value === TITLE_PAGE_CLOSE_STEP_INDEX) {
      next()
    }
  }
)

function onScroll() {
  if (props.visible) updatePopupPosition()
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, true)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll, true)
  document.removeEventListener('keydown', onTrainingEnterKey, true)
})

function ensureDemoLines() {
  const project = store.activeProject
  if (!project || !project.lines) return
  while (project.lines.length < 4) {
    const id = 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2)
    project.lines.push({ id, type: 'action', content: '' })
  }
}
</script>

<style scoped>
.interactive-training-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 0;
  animation: fadeIn 0.3s ease;
  pointer-events: none;
}

.interactive-training-overlay .training-popup {
  pointer-events: auto;
}

.training-highlight-block {
  background: transparent;
  border: none;
  border-radius: 2px;
}

.training-popup {
  position: fixed;
  z-index: 100000;
  background: white;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  min-width: 280px;
  max-width: 360px;
  animation: messagePopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.training-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #eee;
}

.training-step-badge {
  font-size: 12px;
  font-weight: 600;
  color: #2e7d32;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.training-popup-close {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: #666;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  border-radius: 6px;
}

.training-popup-close:hover {
  background: #f0f0f0;
  color: #333;
}

.training-popup-body {
  padding: 16px 14px;
}

.training-popup-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #444;
}

.training-final-title {
  margin: 0 0 12px 0;
  font-size: 22px;
  font-weight: 700;
  color: #2e7d32;
  text-align: center;
}

.training-final-body {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #444;
  text-align: center;
}

.training-popup-actions {
  padding: 12px 14px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.training-popup-actions-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.training-popup-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.training-popup-btn.back {
  background: transparent;
  color: #666;
  border: 1px solid #ddd;
}

.training-popup-btn.back:hover {
  background: #f5f5f5;
  color: #333;
  border-color: #ccc;
}

.training-popup-btn.next {
  background: #2e7d32;
  color: white;
}

.enter-arrow {
  margin-left: 4px;
  font-size: 1.1em;
  font-weight: bold;
}

.training-popup-btn.next:hover {
  background: #1b5e20;
}

.training-popup-btn.done {
  background: #2e7d32;
  color: white;
}

.training-popup-btn.done:hover {
  background: #1b5e20;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes messagePopIn {
  0% {
    opacity: 0;
    transform: scale(0.4) translateY(8px);
  }
  70% {
    opacity: 1;
    transform: scale(1.06) translateY(-2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Dark mode overlay style is applied via overlayStyle computed */

:global(body.dark-mode) .training-popup {
  background: #2a2a2a;
  border-color: #555;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

:global(body.dark-mode) .training-popup-header {
  border-bottom-color: #444;
}

:global(body.dark-mode) .training-step-badge {
  color: #66bb6a;
}

:global(body.dark-mode) .training-popup-close:hover {
  background: #333;
  color: #e0e0e0;
}

:global(body.dark-mode) .training-popup-text {
  color: #ccc;
}

:global(body.dark-mode) .training-final-title {
  color: #66bb6a;
}

:global(body.dark-mode) .training-final-body {
  color: #ccc;
}

:global(body.dark-mode) .training-popup-actions {
  border-top-color: #444;
}

:global(body.dark-mode) .training-popup-btn.back {
  color: #aaa;
  border-color: #555;
}

:global(body.dark-mode) .training-popup-btn.back:hover {
  background: #333;
  color: #e0e0e0;
  border-color: #666;
}

:global(body.dark-mode) .training-popup-btn.next {
  background: #4caf50;
  color: white;
}

:global(body.dark-mode) .training-popup-btn.next:hover {
  background: #388e3c;
}
</style>
