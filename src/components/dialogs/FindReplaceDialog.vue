<!-- src/components/dialogs/FindReplaceDialog.vue -->
<template>
  <Dialog
    v-model:visible="visible"
    :header="mode === 'find' ? 'Find' : 'Find & Replace'"
    :modal="true"
    :style="{ width: '500px' }"
    @hide="resetSearch"
    :dismissableMask="true"
  >
    <div class="find-replace-container">
      <div class="search-field">
        <label>Find:</label>
        <InputText
          v-model="searchText"
          placeholder="Search text..."
          @keydown.enter="findNext"
          class="w-full"
          ref="searchInput"
        />
      </div>

      <div v-if="mode === 'replace'" class="search-field">
        <label>Replace with:</label>
        <InputText
          v-model="replaceText"
          placeholder="Replace text..."
          @keydown.enter="replaceNext"
          class="w-full"
        />
      </div>

      <div class="options-row">
        <div class="checkbox-group">
          <Checkbox v-model="caseSensitive" inputId="caseSensitive" binary />
          <label for="caseSensitive">Case sensitive</label>
        </div>

        <div class="checkbox-group">
          <Checkbox v-model="wholeWord" inputId="wholeWord" binary />
          <label for="wholeWord">Whole word</label>
        </div>

        <div class="checkbox-group">
          <Checkbox v-model="useRegex" inputId="useRegex" binary />
          <label for="useRegex">Regex</label>
        </div>
      </div>

      <div v-if="results.length > 0" class="results-info">
        Found {{ results.length }} match{{ results.length !== 1 ? 'es' : '' }}
        <span v-if="currentResultIndex >= 0">
          ({{ currentResultIndex + 1 }} of {{ results.length }})
        </span>
      </div>

      <div v-if="searchText && results.length === 0" class="no-results">No matches found</div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <div class="left-buttons">
          <Button
            v-if="mode === 'find'"
            label="Replace"
            severity="secondary"
            text
            @click="mode = 'replace'"
          />
        </div>

        <div class="right-buttons">
          <Button label="Previous" @click="findPrevious" :disabled="results.length === 0" />
          <Button label="Next" @click="findNext" :disabled="results.length === 0" />

          <Button
            v-if="mode === 'replace'"
            label="Replace"
            @click="replaceNext"
            :disabled="results.length === 0"
          />
          <Button
            v-if="mode === 'replace'"
            label="Replace All"
            @click="replaceAll"
            :disabled="results.length === 0"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useProjectStore } from '@/stores/project'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'

const props = defineProps(['visible', 'initialMode'])
const emit = defineEmits(['update:visible', 'highlight'])

const store = useProjectStore()
const searchInput = ref(null)

const searchText = ref('')
const replaceText = ref('')
const caseSensitive = ref(false)
const wholeWord = ref(false)
const useRegex = ref(false)
const mode = ref('find')
const results = ref([])
const currentResultIndex = ref(-1)

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

// Watch for dialog opening
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      mode.value = props.initialMode || 'find'
      nextTick(() => {
        searchInput.value?.$el?.focus()
      })
    }
  },
)

// Watch search text changes
watch([searchText, caseSensitive, wholeWord, useRegex], () => {
  if (searchText.value) {
    performSearch()
  } else {
    results.value = []
    currentResultIndex.value = -1
  }
})

const performSearch = () => {
  if (!store.activeProject || !searchText.value) {
    results.value = []
    return
  }

  const matches = []
  const lines = store.activeProject.lines

  lines.forEach((line, lineIndex) => {
    const content = line.content

    if (useRegex.value) {
      try {
        const flags = caseSensitive.value ? 'g' : 'gi'
        const regex = new RegExp(searchText.value, flags)
        let match

        while ((match = regex.exec(content)) !== null) {
          matches.push({
            lineIndex,
            lineId: line.id,
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
          })
        }
      } catch (e) {
        console.error('Invalid regex:', e)
      }
    } else {
      const searchLower = caseSensitive.value ? searchText.value : searchText.value.toLowerCase()
      const contentToSearch = caseSensitive.value ? content : content.toLowerCase()

      let index = 0
      while ((index = contentToSearch.indexOf(searchLower, index)) !== -1) {
        // Check whole word
        if (wholeWord.value) {
          const before = index > 0 ? content[index - 1] : ' '
          const after =
            index + searchLower.length < content.length ? content[index + searchLower.length] : ' '

          if (!/\W/.test(before) || !/\W/.test(after)) {
            index++
            continue
          }
        }

        matches.push({
          lineIndex,
          lineId: line.id,
          start: index,
          end: index + searchLower.length,
          text: content.substring(index, index + searchLower.length),
        })

        index++
      }
    }
  })

  results.value = matches
  currentResultIndex.value = matches.length > 0 ? 0 : -1

  if (matches.length > 0) {
    highlightResult(0)
  }
}

const findNext = () => {
  if (results.value.length === 0) return

  currentResultIndex.value = (currentResultIndex.value + 1) % results.value.length
  highlightResult(currentResultIndex.value)
}

const findPrevious = () => {
  if (results.value.length === 0) return

  currentResultIndex.value =
    currentResultIndex.value <= 0 ? results.value.length - 1 : currentResultIndex.value - 1
  highlightResult(currentResultIndex.value)
}

const highlightResult = (index) => {
  const result = results.value[index]
  if (!result) return

  // Emit event to highlight in editor
  emit('highlight', {
    lineIndex: result.lineIndex,
    lineId: result.lineId,
    start: result.start,
    end: result.end,
  })

  // Scroll to the line in the editor
  nextTick(() => {
    const lineElement = document.querySelector(`[data-line-index="${result.lineIndex}"]`)
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // Highlight the text within the line
      const lineContent = lineElement.querySelector('.line-content')
      if (lineContent) {
        // Remove any existing highlights
        document.querySelectorAll('.search-highlight').forEach((el) => {
          const parent = el.parentNode
          parent.replaceChild(document.createTextNode(el.textContent), el)
          parent.normalize()
        })

        // Add new highlight
        const textNode = lineContent.firstChild
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const range = document.createRange()
          range.setStart(textNode, result.start)
          range.setEnd(textNode, result.end)

          const highlight = document.createElement('mark')
          highlight.className = 'search-highlight'
          range.surroundContents(highlight)
        }
      }
    }
  })
}

const replaceNext = () => {
  if (results.value.length === 0 || currentResultIndex.value < 0) return

  const result = results.value[currentResultIndex.value]
  const line = store.activeProject.lines[result.lineIndex]

  if (line) {
    const newContent =
      line.content.substring(0, result.start) +
      replaceText.value +
      line.content.substring(result.end)

    store.updateLine(line.id, newContent)

    // Re-search after replacement
    nextTick(() => {
      performSearch()
    })
  }
}

const replaceAll = () => {
  if (results.value.length === 0) return

  const lineUpdates = new Map()

  // Group replacements by line
  results.value.forEach((result) => {
    if (!lineUpdates.has(result.lineId)) {
      const line = store.activeProject.lines[result.lineIndex]
      lineUpdates.set(result.lineId, {
        line,
        replacements: [],
      })
    }
    lineUpdates.get(result.lineId).replacements.push(result)
  })

  // Apply all replacements
  lineUpdates.forEach(({ line, replacements }) => {
    let newContent = line.content
    let offset = 0

    // Sort by start position
    replacements.sort((a, b) => a.start - b.start)

    replacements.forEach((result) => {
      const adjustedStart = result.start + offset
      const adjustedEnd = result.end + offset

      newContent =
        newContent.substring(0, adjustedStart) +
        replaceText.value +
        newContent.substring(adjustedEnd)

      offset += replaceText.value.length - (result.end - result.start)
    })

    store.updateLine(line.id, newContent)
  })

  // Re-search
  nextTick(() => {
    performSearch()
  })
}

const resetSearch = () => {
  searchText.value = ''
  replaceText.value = ''
  results.value = []
  currentResultIndex.value = -1

  // Remove all highlights
  document.querySelectorAll('.search-highlight').forEach((el) => {
    const parent = el.parentNode
    parent.replaceChild(document.createTextNode(el.textContent), el)
    parent.normalize()
  })

  emit('highlight', null)
}
</script>

<style scoped>
.find-replace-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-field label {
  font-weight: 600;
  font-size: 14px;
}

.w-full {
  width: 100%;
}

.options-row {
  display: flex;
  gap: 20px;
  padding: 10px 0;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-group label {
  font-size: 14px;
  cursor: pointer;
}

.results-info {
  padding: 10px;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.no-results {
  padding: 10px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
  color: #856404;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.right-buttons {
  display: flex;
  gap: 8px;
}

:global(body.dark-mode) .results-info {
  background: #2a2a2a;
  color: #e0e0e0;
}

:global(body.dark-mode) .no-results {
  background: #3a2a0a;
  border-color: #5a4010;
  color: #ffd700;
}

/* Search highlight */
:global(.search-highlight) {
  background: #ffeb3b;
  color: #000;
  padding: 2px 0;
  border-radius: 2px;
}

:global(body.dark-mode .search-highlight) {
  background: #ffa000;
  color: #fff;
}
</style>
