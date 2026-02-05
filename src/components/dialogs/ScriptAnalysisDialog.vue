<!-- src/components/dialogs/ScriptAnalysisDialog.vue -->
<template>
  <Dialog
    v-model:visible="visible"
    header="Script Analysis"
    :modal="true"
    :style="{ width: '700px' }"
    :dismissableMask="true"
  >
    <div v-if="stats" class="analysis-container">
      <!-- Overview Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.pageCount }}</div>
          <div class="stat-label">Pages</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.sceneCount }}</div>
          <div class="stat-label">Scenes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.characterCount }}</div>
          <div class="stat-label">Characters</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.wordCount.toLocaleString() }}</div>
          <div class="stat-label">Words</div>
        </div>
      </div>

      <!-- Detailed Stats -->
      <div class="details-section">
        <h4>Content Breakdown</h4>
        <div class="breakdown-list">
          <div class="breakdown-item">
            <span class="breakdown-label">Total Lines:</span>
            <span class="breakdown-value">{{ stats.totalLines }}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Dialogue Lines:</span>
            <span class="breakdown-value">{{ stats.dialogueLines }}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Action Lines:</span>
            <span class="breakdown-value">{{ stats.actionLines }}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Dialogue Ratio:</span>
            <span class="breakdown-value">
              {{ ((stats.dialogueLines / stats.totalLines) * 100).toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Reading Time Estimate -->
      <div class="details-section">
        <h4>Time Estimates</h4>
        <div class="breakdown-list">
          <div class="breakdown-item">
            <span class="breakdown-label">Reading Time:</span>
            <span class="breakdown-value">{{ readingTime }} min</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Screen Time (approx):</span>
            <span class="breakdown-value">{{ screenTime }} min</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Pages per Scene:</span>
            <span class="breakdown-value">
              {{ (stats.pageCount / stats.sceneCount).toFixed(1) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Character Analysis -->
      <div class="details-section">
        <h4>Top Characters by Dialogue</h4>
        <div class="character-chart">
          <div v-for="char in topCharacters" :key="char.name" class="character-bar">
            <div class="character-bar-label">{{ char.name }}</div>
            <div class="character-bar-container">
              <div
                class="character-bar-fill"
                :style="{ width: `${(char.lines / maxCharacterLines) * 100}%` }"
              ></div>
              <span class="character-bar-value">{{ char.lines }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Scene/Location Breakdown -->
      <div class="details-section">
        <h4>Locations</h4>
        <div class="location-list">
          <Chip
            v-for="location in locations"
            :key="location.name"
            :label="`${location.name} (${location.count})`"
            class="location-chip"
          />
        </div>
      </div>

      <!-- Day/Night Breakdown -->
      <div class="details-section">
        <h4>Day/Night Breakdown</h4>
        <div class="day-night-chart">
          <div class="chart-bar">
            <div class="chart-segment day" :style="{ width: `${dayNightRatio.day}%` }">
              DAY: {{ dayNightRatio.day.toFixed(0) }}%
            </div>
            <div class="chart-segment night" :style="{ width: `${dayNightRatio.night}%` }">
              NIGHT: {{ dayNightRatio.night.toFixed(0) }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Export Report" icon="pi pi-download" @click="exportReport" />
      <Button label="Close" severity="secondary" @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Chip from 'primevue/chip'

const props = defineProps(['visible'])
const emit = defineEmits(['update:visible'])

const store = useProjectStore()

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const stats = computed(() => store.scriptStats)

const readingTime = computed(() => {
  if (!stats.value) return 0
  // Average reading speed: 200 words per minute
  return Math.ceil(stats.value.wordCount / 200)
})

const screenTime = computed(() => {
  if (!stats.value) return 0
  // Rule of thumb: 1 page = 1 minute
  return stats.value.pageCount
})

const topCharacters = computed(() => {
  if (!store.activeProject) return []

  const charDialogue = new Map()

  let currentChar = null
  store.activeProject.lines.forEach((line) => {
    if (line.type === 'character') {
      currentChar = line.content.trim().toUpperCase()
      if (!charDialogue.has(currentChar)) {
        charDialogue.set(currentChar, 0)
      }
    } else if (line.type === 'dialogue' && currentChar) {
      charDialogue.set(currentChar, charDialogue.get(currentChar) + 1)
    }
  })

  return Array.from(charDialogue.entries())
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)
})

const maxCharacterLines = computed(() => {
  if (topCharacters.value.length === 0) return 1
  return topCharacters.value[0].lines
})

const locations = computed(() => {
  if (!store.activeProject) return []

  const locationMap = new Map()

  store.activeProject.lines.forEach((line) => {
    if (line.type === 'scene-heading') {
      // Extract location from scene heading
      const match = line.content.match(/(?:INT\.|EXT\.)\s+([^-]+)/)
      if (match) {
        const location = match[1].trim()
        locationMap.set(location, (locationMap.get(location) || 0) + 1)
      }
    }
  })

  return Array.from(locationMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
})

const dayNightRatio = computed(() => {
  if (!store.activeProject) return { day: 50, night: 50 }

  let day = 0
  let night = 0

  store.activeProject.lines.forEach((line) => {
    if (line.type === 'scene-heading') {
      const upper = line.content.toUpperCase()
      if (upper.includes('DAY') || upper.includes('MORNING') || upper.includes('AFTERNOON')) {
        day++
      } else if (upper.includes('NIGHT') || upper.includes('EVENING')) {
        night++
      }
    }
  })

  const total = day + night || 1

  return {
    day: (day / total) * 100,
    night: (night / total) * 100,
  }
})

const exportReport = () => {
  if (!store.activeProject || !stats.value) return

  let report = `Script Analysis Report\n`
  report += `Project: ${store.activeProject.name}\n`
  report += `Generated: ${new Date().toLocaleString()}\n\n`

  report += `=== OVERVIEW ===\n`
  report += `Pages: ${stats.value.pageCount}\n`
  report += `Scenes: ${stats.value.sceneCount}\n`
  report += `Characters: ${stats.value.characterCount}\n`
  report += `Words: ${stats.value.wordCount}\n\n`

  report += `=== CONTENT BREAKDOWN ===\n`
  report += `Total Lines: ${stats.value.totalLines}\n`
  report += `Dialogue Lines: ${stats.value.dialogueLines}\n`
  report += `Action Lines: ${stats.value.actionLines}\n`
  report += `Dialogue Ratio: ${((stats.value.dialogueLines / stats.value.totalLines) * 100).toFixed(1)}%\n\n`

  report += `=== TIME ESTIMATES ===\n`
  report += `Reading Time: ${readingTime.value} minutes\n`
  report += `Screen Time: ${screenTime.value} minutes\n\n`

  report += `=== TOP CHARACTERS ===\n`
  topCharacters.value.forEach((char, i) => {
    report += `${i + 1}. ${char.name}: ${char.lines} lines\n`
  })
  report += `\n`

  report += `=== LOCATIONS ===\n`
  locations.value.forEach((loc, i) => {
    report += `${i + 1}. ${loc.name}: ${loc.count} scenes\n`
  })

  const blob = new Blob([report], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.activeProject.name}_analysis.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.analysis-container {
  display: flex;
  flex-direction: column;
  gap: 25px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 13px;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.details-section {
  background: #f8f8f8;
  padding: 20px;
  border-radius: 8px;
}

.details-section h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.breakdown-label {
  font-size: 14px;
  color: #555;
}

.breakdown-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.character-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.character-bar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.character-bar-label {
  width: 120px;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}

.character-bar-container {
  flex: 1;
  height: 24px;
  background: #e0e0e0;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.character-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.character-bar-value {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.location-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.location-chip {
  background: white;
  border: 1px solid #ddd;
}

.day-night-chart {
  width: 100%;
}

.chart-bar {
  display: flex;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chart-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: white;
  transition: width 0.3s;
}

.chart-segment.day {
  background: #ffd700;
  color: #333;
}

.chart-segment.night {
  background: #2c3e50;
}

:global(body.dark-mode) .details-section {
  background: #2a2a2a;
}

:global(body.dark-mode) .details-section h4 {
  color: #aaa;
}

:global(body.dark-mode) .breakdown-item {
  border-color: #444;
}

:global(body.dark-mode) .breakdown-label {
  color: #ccc;
}

:global(body.dark-mode) .breakdown-value {
  color: #e0e0e0;
}

:global(body.dark-mode) .character-bar-container {
  background: #1e1e1e;
}

:global(body.dark-mode) .character-bar-value {
  color: #e0e0e0;
}

:global(body.dark-mode) .location-chip {
  background: #1e1e1e;
  border-color: #444;
}
</style>
