<template>
  <aside class="sidebar notes-sidebar">
    <div class="sidebar-header">
      <h3>Notes</h3>
      <div class="notes-color-filter">
        <button
          type="button"
          class="color-filter-btn"
          :class="{ active: selectedColor === null }"
          title="All notes"
          @click="selectedColor = null"
        >
          All
        </button>
        <button
          v-for="c in HIGHLIGHT_COLORS"
          :key="c.key"
          type="button"
          class="color-filter-swatch"
          :class="{ active: selectedColor === c.key }"
          :style="{ backgroundColor: c.hex }"
          :title="c.key"
          @click="selectedColor = c.key"
        />
      </div>
    </div>
    <div class="notes-list">
      <p v-if="allAnnotations.length === 0" class="notes-empty">No notes yet. Select text and right-click to add a note.</p>
      <template v-else-if="selectedColor">
        <button
          v-for="ann in filteredAnnotations"
          :key="ann.id"
          type="button"
          class="note-item note-item-with-dot"
          @click="onNoteClick(ann)"
        >
          <span class="note-color-dot" :style="{ backgroundColor: getColorHex(ann.color) }" />
          <span class="note-item-text">
            <span class="note-anchor">"{{ truncate(ann.anchorText, 40) }}"</span>
            <span class="note-preview">{{ truncate(ann.noteContent || '—', 60) }}</span>
          </span>
        </button>
      </template>
      <template v-else>
        <div v-for="group in annotationsByColor" :key="group.color" class="notes-group">
          <div class="notes-group-header">
            <span class="notes-group-dot" :style="{ backgroundColor: getColorHex(group.color) }" />
            <span class="notes-group-label">{{ group.label }}</span>
          </div>
          <button
            v-for="ann in group.annotations"
            :key="ann.id"
            type="button"
            class="note-item"
            @click="onNoteClick(ann)"
          >
            <span class="note-item-text">
              <span class="note-anchor">"{{ truncate(ann.anchorText, 40) }}"</span>
              <span class="note-preview">{{ truncate(ann.noteContent || '—', 60) }}</span>
            </span>
          </button>
        </div>
      </template>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project'

const HIGHLIGHT_COLORS = [
  { key: 'yellow', hex: '#fef08a', label: 'Yellow' },
  { key: 'green', hex: '#bbf7d0', label: 'Green' },
  { key: 'blue', hex: '#bfdbfe', label: 'Blue' },
  { key: 'pink', hex: '#fbcfe8', label: 'Pink' },
  { key: 'orange', hex: '#fed7aa', label: 'Orange' },
]

const store = useProjectStore()
const selectedColor = ref(null)

const allAnnotations = computed(() => {
  const project = store.activeProject
  if (!project?.annotations || !project?.lines) return []
  const lineIds = new Set(project.lines.map((l) => l.id))
  return project.annotations.filter((a) => lineIds.has(a.lineId))
})

const filteredAnnotations = computed(() => {
  if (!selectedColor.value) return allAnnotations.value
  return allAnnotations.value.filter((a) => (a.color || 'yellow') === selectedColor.value)
})

const annotationsByColor = computed(() => {
  const groups = HIGHLIGHT_COLORS.map((c) => ({
    color: c.key,
    label: c.label,
    annotations: allAnnotations.value.filter((a) => (a.color || 'yellow') === c.key),
  }))
  return groups.filter((g) => g.annotations.length > 0)
})

const getColorHex = (key) => HIGHLIGHT_COLORS.find((c) => c.key === key)?.hex || '#fef08a'

const truncate = (str, max) => {
  if (!str || str.length <= max) return str || ''
  return str.slice(0, max) + '…'
}

const onNoteClick = (ann) => {
  window.dispatchEvent(new CustomEvent('scroll-to-annotation', { detail: { annotationId: ann.id } }))
}
</script>

<style scoped>
.notes-sidebar {
  width: 280px;
  background-color: #f8f8f8;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ddd;
  background-color: #fff;
}

.sidebar-header h3 {
  font-size: 18px;
  font-weight: 300;
  color: #333;
  margin: 0 0 12px 0;
}

.notes-color-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.color-filter-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #555;
}

.color-filter-btn:hover,
.color-filter-btn.active {
  background: #f0f0f0;
  border-color: #999;
}

.color-filter-btn.active {
  font-weight: 600;
  color: #333;
}

.color-filter-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s;
}

.color-filter-swatch:hover {
  transform: scale(1.1);
}

.color-filter-swatch.active {
  box-shadow: 0 0 0 2px #333;
}

.notes-group {
  margin-bottom: 8px;
}

.notes-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
}

.notes-group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.note-color-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 8px;
}

.notes-list {
  overflow-y: auto;
  flex: 1;
  padding: 8px 0;
}

.note-item {
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
  display: block;
}

.note-item-with-dot {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.note-item-text {
  flex: 1;
  min-width: 0;
  display: block;
}

.note-item:hover {
  background: #f0f0f0;
}

.note-anchor {
  display: block;
  font-size: 12px;
  color: #666;
  font-style: italic;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-preview {
  display: block;
  font-size: 13px;
  color: #333;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notes-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

:global(body.dark-mode) .notes-sidebar {
  background-color: #1e1e1e;
  border-left-color: #444;
}

:global(body.dark-mode) .sidebar-header {
  background-color: #2a2a2a;
  border-bottom-color: #444;
}

:global(body.dark-mode) .sidebar-header h3 {
  color: #e0e0e0;
}

:global(body.dark-mode) .color-filter-btn {
  background: #333;
  border-color: #555;
  color: #aaa;
}

:global(body.dark-mode) .color-filter-btn:hover,
:global(body.dark-mode) .color-filter-btn.active {
  background: #444;
  border-color: #666;
  color: #e0e0e0;
}

:global(body.dark-mode) .color-filter-swatch.active {
  box-shadow: 0 0 0 2px #fff;
}

:global(body.dark-mode) .notes-group-header {
  color: #888;
}

:global(body.dark-mode) .note-item {
  border-bottom-color: #333;
}

:global(body.dark-mode) .note-item:hover {
  background: #333;
}

:global(body.dark-mode) .note-anchor {
  color: #aaa;
}

:global(body.dark-mode) .note-preview {
  color: #e0e0e0;
}

:global(body.dark-mode) .notes-empty {
  color: #888;
}
</style>
