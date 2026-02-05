<template>
  <div v-if="visible" class="draw-mode-overlay-root">
    <canvas
      v-show="drawModeOn"
      ref="canvasRef"
      class="draw-canvas draw-canvas-fixed"
      :style="canvasStyle"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    />
    <!-- Bottom: Draw toggle -->
    <div class="draw-mode-toolbar draw-toolbar-bottom">
      <button
        type="button"
        class="draw-toolbar-btn draw-toggle-btn ig-style-btn"
        :class="{ 'draw-on': drawModeOn }"
        :title="drawModeOn ? 'Stop drawing (tap again)' : 'Start drawing'"
        @click="toggleDrawMode"
      >
        <i class="pi pi-pencil"></i>
        <span class="draw-toggle-label">{{ drawModeOn ? 'Drawing' : 'Draw' }}</span>
      </button>
    </div>
    <!-- Right: Instagram-style vertical toolbar (when drawing) -->
    <div v-show="drawModeOn" class="draw-toolbar-vertical">
      <div class="ig-toolbar-section">
        <div
          v-for="c in DRAW_COLORS"
          :key="c.hex"
          class="ig-color-btn"
          :class="{ active: strokeColor === c.hex, 'color-white': c.hex === '#ffffff' }"
          :style="{ backgroundColor: c.hex }"
          @click="strokeColor = c.hex"
        />
      </div>
      <div class="ig-toolbar-section ig-brush-section">
        <div
          class="ig-brush-preview"
          :style="{ width: brushPreviewSize + 'px', height: brushPreviewSize + 'px', backgroundColor: strokeColor }"
        />
        <div class="ig-slider-wrap">
          <input
            v-model.number="brushSize"
            type="range"
            min="1"
            max="30"
            class="ig-brush-slider"
          />
        </div>
      </div>
      <div class="ig-toolbar-section">
        <button type="button" class="ig-style-btn ig-action-btn" :disabled="!canUndo" title="Undo" @click="undo">
          <i class="pi pi-undo"></i>
        </button>
        <button type="button" class="ig-style-btn ig-action-btn" title="Clear All" @click="clearAll">
          <i class="pi pi-trash"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useProjectStore } from '@/stores/project'

const props = defineProps({
  isMobile: { type: Boolean, default: false },
  isReadMode: { type: Boolean, default: false },
  containerRef: { type: Object, default: null },
  editorRootRef: { type: Object, default: null },
  projectId: { type: String, default: null },
})

const store = useProjectStore()
const STORAGE_KEY = (id) => `artscript-draw-${id || 'default'}`

const drawModeOn = ref(false)
const canvasRef = ref(null)

const visible = computed(() => props.isMobile && props.isReadMode)

const strokes = ref([])
const currentStroke = ref(null)
const isDrawing = ref(false)
let resizeObserver = null

const canUndo = computed(() => strokes.value.length > 0)

const DRAW_COLORS = [
  { hex: '#ffffff', name: 'White' },
  { hex: '#000000', name: 'Black' },
  { hex: '#e74c3c', name: 'Red' },
  { hex: '#f1c40f', name: 'Yellow' },
  { hex: '#39ff14', name: 'Neon Green' },
  { hex: '#3498db', name: 'Blue' },
]

const strokeColor = ref('#e74c3c')
const brushSize = ref(4)

const brushPreviewSize = computed(() => Math.max(8, Math.min(40, brushSize.value * 2)))

let rafId = null

// Canvas: fixed full viewport, explicit sizing
const canvasStyle = computed(() => ({
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 9999,
  pointerEvents: drawModeOn.value ? 'auto' : 'none',
  touchAction: 'none',
  width: '100%',
  height: '100%',
}))

function toggleDrawMode() {
  store.drawModeEnabled = !store.drawModeEnabled
  drawModeOn.value = store.drawModeEnabled
}

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

function getTouchCoords(e) {
  const canvas = canvasRef.value
  if (!canvas || !e.touches?.length) return null
  const rect = canvas.getBoundingClientRect()
  const x = e.touches[0].clientX - rect.left
  const y = e.touches[0].clientY - rect.top
  return { x, y }
}

function getMouseCoords(e) {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function setupContext(ctx, color = strokeColor.value, width = brushSize.value) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = 2
  ctx.shadowColor = color
}

// Smooth stroke using Quadratic Bezier: mid-point between prev and current
function drawStroke(ctx, points, color, width) {
  if (!points || points.length < 2) return
  setupContext(ctx, color, width)
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const midX = (p0.x + p1.x) / 2
    const midY = (p0.y + p1.y) / 2
    ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
  ctx.stroke()
}

function redraw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.shadowBlur = 0
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  strokes.value.forEach((s) => drawStroke(ctx, s.points, s.color || strokeColor.value, s.width ?? brushSize.value))
  if (currentStroke.value?.points?.length) {
    drawStroke(ctx, currentStroke.value.points, currentStroke.value.color, currentStroke.value.width)
  }
}

function scheduleDraw() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    redraw()
  })
}

function onTouchStart(e) {
  if (!drawModeOn.value || e.touches.length > 1) return
  e.preventDefault()
  const coords = getTouchCoords(e)
  if (!coords) return
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  setupContext(ctx)
  ctx.beginPath()
  ctx.moveTo(coords.x, coords.y)
  isDrawing.value = true
  currentStroke.value = { points: [coords], color: strokeColor.value, width: brushSize.value }
}

function onTouchMove(e) {
  if (!drawModeOn.value || !isDrawing.value || e.touches.length > 1) return
  e.preventDefault()
  const coords = getTouchCoords(e)
  if (!coords || !currentStroke.value) return
  currentStroke.value.points.push(coords)
  scheduleDraw()
}

function onTouchEnd(e) {
  e.preventDefault()
  if (e.touches?.length > 0) return
  if (currentStroke.value?.points?.length > 1) {
    strokes.value.push({ ...currentStroke.value })
    saveToStorage()
  }
  currentStroke.value = null
  isDrawing.value = false
}

function onMouseDown(e) {
  if (!drawModeOn.value) return
  const coords = getMouseCoords(e)
  if (!coords) return
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  setupContext(ctx)
  ctx.beginPath()
  ctx.moveTo(coords.x, coords.y)
  isDrawing.value = true
  currentStroke.value = { points: [coords], color: strokeColor.value, width: brushSize.value }
}

function onMouseMove(e) {
  if (!drawModeOn.value || !isDrawing.value) return
  const coords = getMouseCoords(e)
  if (!coords || !currentStroke.value) return
  currentStroke.value.points.push(coords)
  scheduleDraw()
}

function onMouseUp() {
  if (currentStroke.value?.points?.length > 1) {
    strokes.value.push({ ...currentStroke.value })
    saveToStorage()
  }
  currentStroke.value = null
  isDrawing.value = false
}

function undo() {
  if (strokes.value.length === 0) return
  strokes.value.pop()
  redraw()
  saveToStorage()
}

function clearAll() {
  strokes.value = []
  currentStroke.value = null
  redraw()
  saveToStorage()
}

function saveToStorage() {
  if (!props.projectId || typeof localStorage === 'undefined') return
  const data = JSON.stringify({
    strokes: strokes.value,
    strokeColor: strokeColor.value,
    brushSize: brushSize.value,
  })
  localStorage.setItem(STORAGE_KEY(props.projectId), data)
}

function loadFromStorage() {
  if (!props.projectId || typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY(props.projectId))
    if (raw) {
      const data = JSON.parse(raw)
      strokes.value = data.strokes || []
      if (data.strokeColor) strokeColor.value = data.strokeColor
      if (data.brushSize != null) brushSize.value = data.brushSize
      nextTick(redraw)
    }
  } catch {
    strokes.value = []
  }
}

function resizeCanvas() {
  initCanvas()
  nextTick(redraw)
}

watch(
  () => [props.visible, drawModeOn.value],
  () => {
    if (props.visible) {
      nextTick(() => {
        unbindTouchListeners()
        initCanvas()
        loadFromStorage()
        redraw()
        bindTouchListeners()
      })
    }
  },
  { immediate: true }
)

watch(() => store.drawModeEnabled, (v) => { drawModeOn.value = v })

watch(drawModeOn, (on) => {
  if (on) nextTick(() => { initCanvas(); redraw() })
})

function bindTouchListeners() {
  const canvas = canvasRef.value
  if (!canvas) return
  const opts = { passive: false }
  canvas.addEventListener('touchstart', onTouchStart, opts)
  canvas.addEventListener('touchmove', onTouchMove, opts)
  canvas.addEventListener('touchend', onTouchEnd, opts)
  canvas.addEventListener('touchcancel', onTouchEnd, opts)
}

function unbindTouchListeners() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.removeEventListener('touchstart', onTouchStart)
  canvas.removeEventListener('touchmove', onTouchMove)
  canvas.removeEventListener('touchend', onTouchEnd)
  canvas.removeEventListener('touchcancel', onTouchEnd)
}

onMounted(() => {
  drawModeOn.value = store.drawModeEnabled
  initCanvas()
  loadFromStorage()
  nextTick(() => {
    redraw()
    bindTouchListeners()
  })
  window.addEventListener('resize', initCanvas)
  window.addEventListener('resize', redraw)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  unbindTouchListeners()
  window.removeEventListener('resize', initCanvas)
  window.removeEventListener('resize', redraw)
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.draw-mode-overlay-root {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 50;
}

.draw-canvas-fixed {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 9999 !important;
  touch-action: none !important;
}

/* Instagram-style: semi-transparent with blur */
.ig-style-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.draw-toolbar-bottom {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 24px;
  z-index: 10001;
}

.draw-toolbar-btn {
  min-height: 44px;
  border: none;
  color: #fff;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  transition: all 0.2s;
}

.draw-toolbar-btn .pi {
  font-size: 20px;
}

.draw-toggle-btn {
  font-size: 14px;
  font-weight: 500;
}

.draw-toggle-btn.draw-on {
  background: rgba(0, 206, 209, 0.9) !important;
  color: #000 !important;
  font-weight: 600;
}

.draw-toggle-label {
  white-space: nowrap;
}

.draw-toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Vertical toolbar - Instagram Stories style */
.draw-toolbar-vertical {
  position: fixed;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 24px;
  z-index: 10002;
  pointer-events: auto;
}

.ig-toolbar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ig-color-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s;
}

.ig-color-btn:hover {
  transform: scale(1.1);
}

.ig-color-btn.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
}

.ig-color-btn.color-white {
  border: 1px solid rgba(0, 0, 0, 0.25);
}

.ig-brush-section {
  padding: 8px 0;
}

.ig-brush-preview {
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
  transition: width 0.1s, height 0.1s;
}

.ig-slider-wrap {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ig-brush-slider {
  width: 80px;
  height: 6px;
  transform: rotate(-90deg);
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  cursor: pointer;
}

.ig-brush-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  cursor: grab;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.ig-brush-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  cursor: grab;
  border: none;
}

.ig-action-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  padding: 0;
  color: #fff;
}

.ig-action-btn .pi {
  font-size: 18px;
}
</style>
