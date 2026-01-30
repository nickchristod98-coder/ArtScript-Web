<!-- PreviewDialog.vue -->
<template>
  <Dialog
    v-model:visible="visible"
    header="Script Preview"
    :modal="true"
    :style="{ width: '95vw', maxWidth: '1000px' }"
    :dismissableMask="true"
  >
    <div class="preview-container">
      <div class="preview-page" v-for="(page, pageIndex) in pages" :key="pageIndex">
        <div class="preview-page-inner">
          <div class="preview-content">
          <!-- Title Page -->
          <div v-if="pageIndex === 0 && includeTitlePage && titlePage" class="preview-title-page">
            <div class="title-page-content">
              <h1 v-if="titlePage.title" class="preview-title">{{ titlePage.title.toUpperCase() }}</h1>
              <div v-if="titlePage.author" class="preview-author">
                <p>by</p>
                <p>{{ titlePage.author }}</p>
              </div>
              <div v-if="titlePage.draft" class="preview-draft">{{ titlePage.draft }}</div>
              <div v-if="titlePage.contact" class="preview-contact">{{ titlePage.contact }}</div>
            </div>
          </div>

          <!-- Script Content -->
          <div v-else class="preview-script">
            <div
              v-for="(line, lineIndex) in page.lines"
              :key="lineIndex"
              :class="['preview-line', `preview-line-${line.type}`]"
            >
              <span v-if="line.type === 'scene-heading' && includeSceneNumbers && line.sceneNumber" class="preview-scene-number">
                {{ line.sceneNumber }}.
              </span>
              <span :class="['preview-line-content', `preview-${line.type}`]">
                {{ formatLineContent(line) }}
              </span>
            </div>
          </div>

          <!-- Page Number -->
          <div class="preview-page-number">{{ pageIndex + (includeTitlePage && titlePage ? 2 : 1) }}.</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Close" severity="secondary" @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const props = defineProps(['visible'])
const emit = defineEmits(['update:visible'])

const store = useProjectStore()
const includeTitlePage = ref(true)
const includeSceneNumbers = ref(true)
const printNotes = ref(false)

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const titlePage = computed(() => store.activeProject?.titlePage)

const pages = computed(() => {
  if (!store.activeProject) return []

  const lines = store.activeProject.lines
  const pageLines = []
  let currentPage = []
  let currentHeight = 0
  let sceneNumber = 0

  // Match PDF export spacing exactly
  const LINE_HEIGHT = 14.4 // pt (12pt font * 1.2 line height)
  const PAGE_HEIGHT = 792 - 45 // 792pt page - 40pt top - 5pt bottom margins (matching PDF)
  const TOP_MARGIN = 40

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip notes if printNotes is disabled (matching PDF export)
    if (line.type === 'note' && !printNotes.value) {
      continue
    }
    
    const spacing = getLineSpacing(line.type)
    const lineHeight = LINE_HEIGHT
    const threeLinesHeight = lineHeight * 3 // Space for 3 additional lines (matching PDF)

    // Increment scene number for headings
    if (line.type === 'scene-heading') {
      sceneNumber++
    }

    const lineData = {
      ...line,
      sceneNumber: line.type === 'scene-heading' ? sceneNumber : null,
    }

    // Check if we need a new page (matching PDF export logic)
    if (currentPage.length > 0 && currentHeight + spacing.before + lineHeight + spacing.after > PAGE_HEIGHT - threeLinesHeight) {
      pageLines.push({ lines: currentPage })
      currentPage = []
      currentHeight = TOP_MARGIN
    }

    // Add spacing before
    if (currentPage.length === 0) {
      currentHeight = TOP_MARGIN
    } else {
      currentHeight += spacing.before
    }

    // Add line
    currentPage.push(lineData)
    currentHeight += lineHeight + spacing.after
  }

  // Add last page
  if (currentPage.length > 0) {
    pageLines.push({ lines: currentPage })
  }

  return pageLines
})

const getLineSpacing = (type) => {
  switch (type) {
    case 'scene-heading':
      return { before: 24, after: 12 }
    case 'action':
      return { before: 0, after: 12 }
    case 'character':
      return { before: 12, after: 0 }
    case 'dialogue':
      return { before: 0, after: 12 }
    case 'parenthetical':
      return { before: 0, after: 0 }
    case 'transition':
      return { before: 12, after: 12 }
    default:
      return { before: 0, after: 12 }
  }
}

const formatLineContent = (line) => {
  const content = line.content || ''
  switch (line.type) {
    case 'scene-heading':
      return content.toUpperCase()
    case 'character':
      return content.toUpperCase()
    case 'transition':
      return content.toUpperCase()
    default:
      return content
  }
}
</script>

<style scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.preview-page {
  background: #f5f5f5;
  width: 612px;
  min-height: 792px;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  border: 1px solid #ddd;
}

.preview-page-inner {
  background: white;
  width: 612px;
  min-height: 792px;
  position: relative;
  margin: 0;
}

/* Margin indicators */
.preview-page::before {
  content: '';
  position: absolute;
  top: 40px;
  left: 108px;
  right: 72px;
  bottom: 5px;
  border: 1px dashed #ccc;
  pointer-events: none;
  z-index: 1;
}

.preview-content {
  padding: 40px 72px 5px 108px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12pt;
  line-height: 1.2;
  color: #000;
  min-height: 747px;
  position: relative;
  z-index: 2;
  background: white;
}


/* Title Page */
.preview-title-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.title-page-content {
  width: 100%;
}

.preview-title {
  font-size: 14pt;
  font-weight: bold;
  margin: 0 0 40px 0;
  line-height: 1.4;
}

.preview-author {
  margin-top: 40px;
}

.preview-author p {
  margin: 10px 0;
  font-size: 12pt;
}

.preview-draft {
  position: absolute;
  bottom: 144px;
  left: 108px;
  font-size: 11pt;
}

.preview-contact {
  position: absolute;
  bottom: 144px;
  right: 72px;
  font-size: 11pt;
  text-align: right;
  white-space: pre-line;
}

/* Script Lines */
.preview-line {
  position: relative;
  margin: 0;
  min-height: 14.4pt;
}

.preview-scene-number {
  position: absolute;
  left: -40px;
  color: #999;
  font-size: 11pt;
}

.preview-line-content {
  display: block;
}

/* Scene Heading */
.preview-line-scene-heading {
  margin-top: 24pt;
  margin-bottom: 12pt;
}

.preview-scene-heading {
  font-weight: bold;
  text-transform: uppercase;
}

/* Action */
.preview-line-action {
  margin-bottom: 12pt;
}

/* Character */
.preview-line-character {
  margin-top: 12pt;
  margin-left: 170px;
}

.preview-character {
  text-transform: uppercase;
}

/* Dialogue */
.preview-line-dialogue {
  margin-left: 120px;
  margin-right: 120px;
  margin-bottom: 12pt;
}

/* Parenthetical */
.preview-line-parenthetical {
  margin-left: 160px;
  margin-right: 160px;
  font-style: italic;
}

/* Transition */
.preview-line-transition {
  margin-top: 12pt;
  margin-bottom: 12pt;
  text-align: right;
}

.preview-transition {
  font-weight: bold;
  text-transform: uppercase;
}

/* Page Number */
.preview-page-number {
  position: absolute;
  bottom: 5px;
  right: 72px;
  font-size: 10pt;
  color: #666;
}

/* Dark Mode */
:global(body.dark-mode) .preview-container {
  background: #1a1a1a;
}

:global(body.dark-mode) .preview-page {
  background: #2a2a2a;
  border-color: #444;
}

:global(body.dark-mode) .preview-page-inner {
  background: #1e1e1e;
}

:global(body.dark-mode) .preview-page::before {
  border-color: #555;
}

:global(body.dark-mode) .preview-content {
  background: #1e1e1e;
  color: #e0e0e0;
}

:global(body.dark-mode) .preview-scene-number {
  color: #666;
}

:global(body.dark-mode) .preview-page-number {
  color: #888;
}

:global(body.dark-mode) .preview-margin-label {
  color: #666;
}
</style>
