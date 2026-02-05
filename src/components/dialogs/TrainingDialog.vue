<!-- TrainingDialog.vue - Tutorials for ArtScript Web -->
<template>
  <div
    v-if="visible"
    class="training-overlay"
    @click.self="close"
  >
    <div class="training-dialog" @click.stop>
      <div class="training-header">
        <h2 class="training-title">
          <i class="pi pi-book"></i> App Tour
        </h2>
        <button type="button" class="training-close" @click="close" title="Close">×</button>
      </div>

      <div class="training-content">
        <div class="training-slide">
          <div class="training-slide-image-wrap">
            <img
              v-if="tutorials[currentStep].image"
              :src="tutorials[currentStep].image"
              :alt="tutorials[currentStep].title"
              class="training-image"
              @error="onImageError"
            />
            <div
              v-else
              class="training-image-placeholder"
              :class="{ 'has-error': tutorials[currentStep].imageError }"
            >
              <i class="pi pi-image"></i>
              <span>Add screenshot to <code>public/Photos_USE/</code></span>
            </div>
          </div>
          <div class="training-slide-body">
            <h3 class="training-slide-title">{{ tutorials[currentStep].title }}</h3>
            <p class="training-slide-desc">{{ tutorials[currentStep].description }}</p>
          </div>
        </div>
      </div>

      <div class="training-footer">
        <div class="training-dots">
          <button
            v-for="(t, i) in tutorials"
            :key="i"
            type="button"
            class="training-dot"
            :class="{ active: i === currentStep }"
            :title="t.title"
            @click="currentStep = i"
          />
        </div>
        <div class="training-nav">
          <button
            type="button"
            class="training-btn prev"
            :disabled="currentStep === 0"
            @click="currentStep = Math.max(0, currentStep - 1)"
          >
            <i class="pi pi-chevron-left"></i> Previous
          </button>
          <span class="training-step-label">{{ currentStep + 1 }} / {{ tutorials.length }}</span>
          <button
            type="button"
            class="training-btn next"
            :disabled="currentStep === tutorials.length - 1"
            @click="currentStep = Math.min(tutorials.length - 1, currentStep + 1)"
          >
            Next <i class="pi pi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

/** Path to training images in public/Photos_USE – absolute URL for local and GitHub Pages */
function getTrainingImagePath(filename) {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : base + '/'
  const path = `${root}Photos_USE/${filename}`
  if (typeof window !== 'undefined') {
    return new URL(path, window.location.origin).href
  }
  return path
}

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible'])

const currentStep = ref(0)

const tutorials = ref([
  {
    title: 'Welcome to ArtScript Web',
    description: 'ArtScript Web is a focused script-writing app for Film, TV Show, and Book formats. Create a new project from the File menu, then start writing. Your work is auto-saved locally.',
    image: getTrainingImagePath('SCR_1b.png'),
    imageError: false,
  },
  {
    title: 'Creating a New Project',
    description: 'Click the File menu (hamburger icon) and choose New → Film, TV Show, or Book. Each format has the right structure: Film uses scenes, TV Show uses seasons and episodes, Book uses chapters.',
    image: getTrainingImagePath('SCR_2b.png'),
    imageError: false,
  },
  {
    title: 'The Script Editor',
    description: 'Each line has a type: Scene Heading, Action, Character, Dialogue, Transition. Type normally; the app detects line types automatically. Scene headings start with INT., EXT. (English) or ΕΣΩ., ΕΞΩ., έσω., έξω. (Greek). Use Ctrl+1 through Ctrl+5 to force a line type, or use the File → Force submenu.',
    image: getTrainingImagePath('SCR_3.png'),
    imageError: false,
  },
  {
    title: 'Scenes & Chapters Sidebar',
    description: 'Use the left sidebar to jump between scenes (or chapters in Book format). Click a scene to scroll there. Hover for a preview. Use the grid icon to open the scene showcase and see all scenes at once.',
    image: getTrainingImagePath('SCR_4.png'),
    imageError: false,
  },
  {
    title: 'Characters Tab',
    description: 'Switch to the Characters tab in the left sidebar to see all characters in your script. Click a character to add description, notes, and aliases. Use "Find in Script" to jump to their lines.',
    image: getTrainingImagePath('SCR_5.png'),
    imageError: false,
  },
  {
    title: 'Title Page & Export',
    description: 'Set your title page via File → Title Page. Preview how the script will look with File → Preview. Export to PDF (File → Export PDF) or Fountain (File → Export Fountain) for sharing or backup.',
    image: getTrainingImagePath('SCR_6.png'),
    imageError: false,
  },
  {
    title: 'Spell & Grammar Check',
    description: 'Turn on spell check with the checkmark icon in the toolbar. For full grammar checking, use File → Spell & Grammar. Choose your language and click "Check document" to see suggestions and apply fixes.',
    image: getTrainingImagePath('SCR_7.png'),
    imageError: false,
  },
  {
    title: 'More Tools',
    description: 'Use Find (Ctrl+F) and Replace (Ctrl+H) from the File menu. Add notes by selecting text, right-clicking, and choosing "+ Note"—underlined text opens the note. Script Analysis and Replace Character are under File as well.',
    image: getTrainingImagePath('SCR_8.png'),
    imageError: false,
  },
])

function onImageError() {
  const step = currentStep.value
  if (tutorials.value[step]) {
    tutorials.value[step].imageError = true
    tutorials.value[step].image = null
  }
}

function close() {
  emit('update:visible', false)
}

watch(
  () => props.visible,
  (v) => {
    if (v) currentStep.value = 0
  },
)
</script>

<style scoped>
.training-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  padding: 24px;
  animation: fadeIn 0.2s ease;
}

.training-dialog {
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

.training-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.training-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}

.training-title i {
  font-size: 24px;
  color: #1976d2;
}

.training-close {
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  color: #666;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.training-close:hover {
  background: #f0f0f0;
  color: #333;
}

.training-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.training-slide {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.training-slide-image-wrap {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  border: 1px solid #e5e5e5;
}

.training-image {
  width: 100%;
  height: auto;
  display: block;
  max-height: 360px;
  object-fit: contain;
  object-position: top;
}

.training-image-placeholder {
  width: 100%;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #999;
  font-size: 14px;
  padding: 32px;
}

.training-image-placeholder i {
  font-size: 48px;
  opacity: 0.5;
}

.training-image-placeholder code {
  font-size: 12px;
  background: #e8e8e8;
  padding: 4px 8px;
  border-radius: 4px;
  color: #555;
}

.training-slide-body {
  flex: 1;
}

.training-slide-title {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: #222;
}

.training-slide-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: #444;
}

.training-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.training-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.training-dot {
  width: 10px;
  height: 10px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #ccc;
  cursor: pointer;
  transition: all 0.2s;
}

.training-dot:hover {
  background: #999;
}

.training-dot.active {
  background: #1976d2;
  transform: scale(1.2);
}

.training-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.training-btn {
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.training-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #999;
}

.training-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.training-btn.next {
  margin-left: auto;
}

.training-step-label {
  font-size: 13px;
  color: #666;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dark mode */
:global(body.dark-mode) .training-dialog {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 12px;
  overflow: hidden;
}

:global(body.dark-mode) .training-header {
  border-bottom-color: #444;
  border-radius: 12px 12px 0 0;
}

:global(body.dark-mode) .training-footer {
  border-top-color: #444;
  border-radius: 0 0 12px 12px;
}

:global(body.dark-mode) .training-title {
  color: #e0e0e0;
}

:global(body.dark-mode) .training-close:hover {
  background: #333;
  color: #e0e0e0;
}

:global(body.dark-mode) .training-slide-image-wrap {
  background: #1a1a1a;
  border-color: #444;
}

:global(body.dark-mode) .training-image-placeholder {
  color: #666;
}

:global(body.dark-mode) .training-image-placeholder code {
  background: #333;
  color: #aaa;
}

:global(body.dark-mode) .training-slide-title {
  color: #e0e0e0;
}

:global(body.dark-mode) .training-slide-desc {
  color: #bbb;
}

:global(body.dark-mode) .training-dot {
  background: #555;
}

:global(body.dark-mode) .training-dot:hover {
  background: #777;
}

:global(body.dark-mode) .training-dot.active {
  background: #4a9eff;
}

:global(body.dark-mode) .training-btn {
  background: #333;
  border-color: #555;
  color: #e0e0e0;
}

:global(body.dark-mode) .training-btn:hover:not(:disabled) {
  background: #444;
  border-color: #666;
}

:global(body.dark-mode) .training-step-label {
  color: #999;
}
</style>
