<!-- Interactive step-by-step training overlay -->
<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="interactive-training-overlay"
      :style="overlayStyle"
      @click.self="close"
    >
      <div :key="currentStep" class="training-popup" :style="popupStyle" @click.stop>
        <div class="training-popup-header">
          <span class="training-step-badge">Step {{ currentStep + 1 }} of {{ steps.length }}</span>
          <button type="button" class="training-popup-close" @click="close" title="Close">×</button>
        </div>
        <div class="training-popup-body">
          <p class="training-popup-text">{{ steps[currentStep].text }}</p>
        </div>
        <div class="training-popup-actions">
          <button
            v-if="currentStep < steps.length - 1"
            type="button"
            class="training-popup-btn next"
            @click="next"
          >
            Next <i class="pi pi-chevron-right"></i>
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

const steps = [
  {
    lineIndex: 0,
    text: "Start with a scene heading. Type INT. or EXT. followed by the location and time, e.g. INT. COFFEE SHOP - DAY or EXT. PARK - NIGHT. The app detects it automatically.",
  },
  {
    lineIndex: 1,
    text: "On the next line, add your character's name in ALL CAPS, e.g. JOHN. Character names are always uppercase in screenplay format.",
  },
]

const overlayStyle = computed(() => {
  const { cx, cy, radius } = spotlightPosition.value
  const dim = store.darkMode ? 'rgba(0,0,0,0.65)' : 'rgba(100,100,100,0.5)'
  const ring = store.darkMode ? 'rgba(74,158,255,0.25)' : 'rgba(25,118,210,0.2)'
  return {
    background: `radial-gradient(circle at ${cx}px ${cy}px, transparent ${radius - 4}px, ${ring} ${radius}px, ${dim} ${radius}px)`,
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

function updatePopupPosition() {
  nextTick(() => {
    const lineIndex = steps[currentStep.value]?.lineIndex ?? 0
    const rect = getLineRect(lineIndex)
    const lineContent = document.querySelector(`.script-editor [data-line-index="${lineIndex}"] .line-content`)
    const contentRect = lineContent?.getBoundingClientRect?.()

    if (rect) {
      const left = Math.min(rect.left, window.innerWidth - 320)
      popupPosition.value = {
        top: rect.bottom + 12,
        left,
        origin: 'top center',
      }
      const cx = contentRect ? contentRect.left + contentRect.width / 2 : rect.left + rect.width / 2
      const cy = contentRect ? contentRect.top + contentRect.height / 2 : rect.top + rect.height / 2
      spotlightPosition.value = { cx, cy, radius: 90 }

      document.querySelector(`.script-editor [data-line-index="${lineIndex}"]`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      focusLine(lineIndex)
    } else {
      const editor = document.querySelector('.editor-wrapper')
      if (editor) {
        const er = editor.getBoundingClientRect()
        popupPosition.value = { top: er.top + 80, left: er.left + 40, origin: 'top left' }
        spotlightPosition.value = { cx: er.left + er.width / 2, cy: er.top + 120, radius: 90 }
      }
    }
  })
}

function next() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    updatePopupPosition()
  } else {
    close()
  }
}

function close() {
  emit('update:visible', false)
  store.showInteractiveTraining = false
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
})

function ensureDemoLines() {
  const project = store.activeProject
  if (!project || !project.lines) return
  while (project.lines.length < 2) {
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
  color: #1976d2;
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

.training-popup-actions {
  padding: 12px 14px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
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

.training-popup-btn.next {
  background: #1976d2;
  color: white;
}

.training-popup-btn.next:hover {
  background: #1565c0;
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
  color: #4a9eff;
}

:global(body.dark-mode) .training-popup-close:hover {
  background: #333;
  color: #e0e0e0;
}

:global(body.dark-mode) .training-popup-text {
  color: #ccc;
}

:global(body.dark-mode) .training-popup-actions {
  border-top-color: #444;
}
</style>
