<!-- src/components/dialogs/SpellGrammarDialog.vue -->
<template>
  <Dialog
    v-model:visible="visible"
    header="Spell & Grammar Check"
    :modal="true"
    :style="{ width: '560px' }"
    :dismissableMask="true"
    class="spell-grammar-dialog"
    @hide="onHide"
  >
    <div class="spell-grammar-container">
      <p class="spell-grammar-intro">
        Check your script for spelling and grammar using
        <a href="https://languagetool.org" target="_blank" rel="noopener">LanguageTool</a> (free, rate-limited).
      </p>

      <div class="language-row">
        <label for="spell-lang">Language:</label>
        <select id="spell-lang" v-model="language" class="language-select">
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="auto">Auto-detect</option>
        </select>
      </div>

      <div v-if="error" class="spell-grammar-error">{{ error }}</div>
      <div v-if="checking" class="spell-grammar-checking">
        <i class="pi pi-spin pi-spinner"></i> Checking…
      </div>

      <div v-if="matches.length > 0 && !checking" class="matches-summary">
        Found {{ matches.length }} issue{{ matches.length !== 1 ? 's' : '' }}
      </div>

      <div v-if="matches.length === 0 && checked && !checking" class="no-issues">
        <i class="pi pi-check-circle"></i> No spelling or grammar issues found.
      </div>

      <div class="matches-list" v-if="matches.length > 0 && !checking">
        <div
          v-for="(item, idx) in matches"
          :key="idx"
          class="match-item"
          :class="item.applied ? 'applied' : ''"
        >
          <div class="match-header">
            <span class="match-category">{{ item.ruleCategory }}</span>
            <span class="match-line">Line {{ item.lineIndex + 1 }}</span>
          </div>
          <div class="match-message">{{ item.message }}</div>
          <div class="match-context">
            “…{{ item.context }}…”
          </div>
          <div v-if="item.replacements.length && !item.applied" class="match-actions">
            <button
              v-for="(rep, rIdx) in item.replacements.slice(0, 5)"
              :key="rIdx"
              class="apply-btn"
              @click="applyReplacement(item, rep.value)"
            >
              {{ rep.value }}
            </button>
          </div>
          <div v-if="item.applied" class="match-applied">Applied</div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Check document" icon="pi pi-check" @click="runCheck" :loading="checking" :disabled="!hasText" />
        <Button label="Close" severity="secondary" text @click="visible = false" />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible'])

const store = useProjectStore()

const visible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

const language = ref(store.spellGrammarLanguage || 'en-US')
const checking = ref(false)
const error = ref('')
const checked = ref(false)
const matches = ref([])
const fullText = ref('')
const lineBoundaries = ref([]) // [{ start, end, lineId, content }]

const hasText = computed(() => {
  const project = store.activeProject
  if (!project || !project.lines) return false
  return project.lines.some((l) => (l.content || '').trim().length > 0)
})

watch(
  () => store.spellGrammarLanguage,
  (v) => {
    if (v) language.value = v
  },
)

watch(language, (v) => {
  store.spellGrammarLanguage = v
})

function buildFullText() {
  const project = store.activeProject
  if (!project || !project.lines) {
    fullText.value = ''
    lineBoundaries.value = []
    return
  }
  const lines = project.lines
  const parts = []
  const boundaries = []
  let offset = 0
  for (let i = 0; i < lines.length; i++) {
    const content = lines[i].content ?? ''
    const lineEnd = i < lines.length - 1 ? '\n' : ''
    boundaries.push({
      start: offset,
      end: offset + content.length,
      lineIndex: i,
      lineId: lines[i].id,
      content,
    })
    parts.push(content + lineEnd)
    offset += content.length + lineEnd.length
  }
  fullText.value = parts.join('')
  lineBoundaries.value = boundaries
}

function globalOffsetToLine(globalOffset, length) {
  const boundaries = lineBoundaries.value
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i]
    if (globalOffset >= b.start && globalOffset + length <= b.end) {
      return {
        lineIndex: b.lineIndex,
        lineId: b.lineId,
        startInLine: globalOffset - b.start,
        endInLine: globalOffset - b.start + length,
        content: b.content,
      }
    }
  }
  return null
}

async function runCheck() {
  buildFullText()
  const text = fullText.value
  if (!text.trim()) {
    error.value = 'No text to check.'
    return
  }
  if (text.length > 20000) {
    error.value = 'Text is too long (max 20,000 characters per check).'
    return
  }

  checking.value = true
  error.value = ''
  checked.value = true
  matches.value = []

  try {
    const form = new URLSearchParams()
    form.append('text', text)
    form.append('language', language.value)

    const res = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      body: form,
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      const t = await res.text()
      throw new Error(res.status === 429 ? 'Rate limit exceeded. Please try again in a minute.' : t || `HTTP ${res.status}`)
    }

    const data = await res.json()
    const rawMatches = data.matches || []

    const mapped = []
    for (const m of rawMatches) {
      const loc = globalOffsetToLine(m.offset, m.length)
      if (!loc) continue
      const context = (m.context?.text || text).slice(Math.max(0, m.offset - 20), m.offset + m.length + 20).trim()
      mapped.push({
        offset: m.offset,
        length: m.length,
        message: m.message || m.shortMessage || 'Issue',
        ruleCategory: m.rule?.category?.name || 'Grammar',
        replacements: m.replacements || [],
        context,
        lineIndex: loc.lineIndex,
        lineId: loc.lineId,
        startInLine: loc.startInLine,
        endInLine: loc.endInLine,
        content: loc.content,
        applied: false,
      })
    }
    matches.value = mapped
  } catch (e) {
    error.value = e.message || 'Check failed. Try again later.'
  } finally {
    checking.value = false
  }
}

function applyReplacement(item, replacement) {
  const project = store.activeProject
  if (!project) return
  const line = project.lines[item.lineIndex]
  if (!line) return
  const before = item.content
  const newContent = before.slice(0, item.startInLine) + replacement + before.slice(item.endInLine)
  store.pushToHistory()
  store.updateLine(line.id, newContent)
  item.applied = true
  item.content = newContent
  item.startInLine = item.startInLine
  item.endInLine = item.startInLine + replacement.length
}

function onHide() {
  error.value = ''
  checked.value = false
  matches.value = []
}
</script>

<style scoped>
.spell-grammar-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.spell-grammar-intro {
  font-size: 13px;
  color: #555;
  margin: 0;
}

.spell-grammar-intro a {
  color: #1976d2;
  text-decoration: none;
}

.spell-grammar-intro a:hover {
  text-decoration: underline;
}

.language-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.language-row label {
  font-size: 13px;
  color: #333;
}

.language-select {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 13px;
  min-width: 140px;
}

.spell-grammar-error {
  padding: 8px 10px;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 6px;
  font-size: 13px;
}

.spell-grammar-checking {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.no-issues {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #16a34a;
}

.matches-summary {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.matches-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.match-item {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.match-item.applied {
  opacity: 0.7;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.match-category {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
}

.match-line {
  font-size: 12px;
  color: #6b7280;
}

.match-message {
  font-size: 13px;
  color: #111;
  margin-bottom: 4px;
}

.match-context {
  font-size: 12px;
  color: #4b5563;
  font-family: ui-monospace, monospace;
  margin-bottom: 8px;
}

.match-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.apply-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  color: #374151;
}

.apply-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.match-applied {
  font-size: 12px;
  color: #16a34a;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:global(body.dark-mode) .match-item {
  background: #2a2a2a;
  border-color: #444;
}

:global(body.dark-mode) .match-item.applied {
  background: #1a2e1a;
  border-color: #2d5a2d;
}

:global(body.dark-mode) .match-message,
:global(body.dark-mode) .match-context {
  color: #e5e7eb;
}

:global(body.dark-mode) .apply-btn {
  background: #333;
  border-color: #555;
  color: #e5e7eb;
}

:global(body.dark-mode) .apply-btn:hover {
  background: #444;
}
</style>
