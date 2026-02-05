<template>
  <div class="scene-timeline-bar">
    <div class="scene-timeline-header">
      <span class="scene-timeline-label">{{ label }}</span>
      <span class="scene-timeline-total">{{ formatTotalRuntime }}</span>
    </div>
    <div class="scene-timeline-track">
      <div
        v-for="(scene, i) in sceneSegments"
        :key="scene.id"
        class="scene-segment"
        :class="{ active: store.selectedSceneId === scene.id }"
        :style="{ width: scene.percent + '%' }"
        :title="scene.title + ' – ' + formatMinutes(scene.minutes)"
        @click="goToScene(scene.index)"
      >
        <span v-if="scene.percent >= 6" class="scene-segment-title">{{ truncate(scene.title, 10) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project'

const store = useProjectStore()

const isBookFormat = computed(() => store.activeProject?.format === 'Book')
const label = computed(() => (isBookFormat.value ? 'Chapters' : 'Scenes'))

const sceneSegments = computed(() => {
  const scenes = store.activeScenesWithRuntime
  if (!scenes.length) return []
  const total = scenes.reduce((s, sc) => s + sc.minutes, 0)
  return scenes.map((sc) => ({
    ...sc,
    percent: total > 0 ? (sc.minutes / total) * 100 : 100 / scenes.length,
  }))
})

const totalMinutes = computed(() =>
  sceneSegments.value.reduce((s, sc) => s + sc.minutes, 0)
)

const formatTotalRuntime = computed(() => {
  const m = totalMinutes.value
  if (m < 1) return '< 1 min'
  if (m < 60) return Math.round(m) + ' min'
  const h = Math.floor(m / 60)
  const mins = Math.round(m % 60)
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`
})

function formatMinutes(m) {
  if (m < 1) return '< 1 min'
  if (m < 60) return Math.round(m) + ' min'
  const h = Math.floor(m / 60)
  const mins = Math.round(m % 60)
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`
}

function truncate(str, max) {
  if (!str || str.length <= max) return str
  return str.slice(0, max - 1) + '…'
}

function goToScene(lineIndex) {
  store.selectedSceneId = sceneSegments.value.find((s) => s.index === lineIndex)?.id ?? null
  window.dispatchEvent(new CustomEvent('scroll-to-scene', { detail: { lineIndex } }))
}
</script>

<style scoped>
.scene-timeline-bar {
  flex-shrink: 0;
  height: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  min-height: 0;
}

.scene-timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 11px;
  color: #6c757d;
}

.scene-timeline-label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.scene-timeline-total {
  font-weight: 500;
}

.scene-timeline-track {
  display: flex;
  width: 100%;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  background: #e9ecef;
}

.scene-segment {
  flex-shrink: 0;
  min-width: 8px;
  height: 100%;
  background: linear-gradient(135deg, #4a90d9 0%, #357abd 100%);
  cursor: pointer;
  transition: filter 0.15s ease, opacity 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
}

.scene-segment:hover {
  filter: brightness(1.1);
}

.scene-segment.active {
  filter: brightness(1.2);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5);
}

.scene-segment-title {
  font-size: 9px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
}

:global(body.dark-mode) .scene-timeline-bar {
  background: #2a2a2a;
  border-top-color: #444;
}

:global(body.dark-mode) .scene-timeline-header {
  color: #aaa;
}

:global(body.dark-mode) .scene-timeline-track {
  background: #3a3a3a;
}

:global(body.dark-mode) .scene-segment {
  background: linear-gradient(135deg, #3d7dd8 0%, #2a6bb8 100%);
}
</style>
