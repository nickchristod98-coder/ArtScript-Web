<template>
  <div
    class="app-drop-zone"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
    :class="{ 'drop-active': isDragging }"
  >
    <RouterView />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'

const router = useRouter()
const store = useProjectStore()
const isDragging = ref(false)

const ALLOWED_EXTENSIONS = ['.asxpro', '.fountain', '.fnt']

const onDragOver = (e) => {
  const hasFile = Array.from(e.dataTransfer?.items || []).some((item) => {
    if (item.kind !== 'file') return false
    const file = item.getAsFile()
    const name = (file?.name || '').toLowerCase()
    return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
  })
  if (hasFile) isDragging.value = true
}

const onDragLeave = () => {
  isDragging.value = false
}

const onDrop = async (e) => {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return

  const name = file.name.toLowerCase()
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) return

  try {
    const text = await file.text()
    let id
    if (name.endsWith('.fountain') || name.endsWith('.fnt')) {
      id = store.importProjectFromFountain(text, file.name)
    } else {
      id = store.importProjectFromJSON(text, file.name)
    }
    if (id) {
      store.saveToRecentProjects(id)
      router.push(`/project/${id}`)
    }
  } catch (err) {
    console.error('Failed to open dropped file', err)
    alert('Could not open file. Please try using Open From File.')
  }
}

const preventDefault = (e) => e.preventDefault()

onMounted(() => {
  document.body.addEventListener('dragover', preventDefault, false)
  document.body.addEventListener('drop', preventDefault, false)
})

onUnmounted(() => {
  document.body.removeEventListener('dragover', preventDefault, false)
  document.body.removeEventListener('drop', preventDefault, false)
})
</script>

<style>
/* Reset default Vue styling that might conflict */
#app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: block; /* Overrides default grid/flex */
  max-width: none; /* Overrides default width limits */
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* Title font: Montserrat Light – app title and script name (e.g. "Untitled Script") at top */
.app-title-inline,
.project-name-input,
.launch-menu-title,
.about-title {
  font-family: 'Montserrat', sans-serif !important;
  font-weight: 300 !important;
}

.app-drop-zone {
  width: 100%;
  height: 100%;
  min-height: 100vh;
}
</style>
