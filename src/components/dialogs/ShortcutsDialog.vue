<!-- src/components/dialogs/ShortcutsDialog.vue -->
<template>
  <Dialog
    v-model:visible="visible"
    header="Keyboard Shortcuts"
    :modal="true"
    :style="{ width: '600px' }"
    :dismissableMask="true"
  >
    <div class="shortcuts-container">
      <div class="shortcuts-section">
        <h4>File Operations</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>N</kbd> </span>
            <span class="shortcut-desc">New Project</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>O</kbd> </span>
            <span class="shortcut-desc">Open Project</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>S</kbd> </span>
            <span class="shortcut-desc">Save Project</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>E</kbd> </span>
            <span class="shortcut-desc">Export PDF</span>
          </div>
        </div>
      </div>

      <div class="shortcuts-section">
        <h4>Editing</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>Z</kbd> </span>
            <span class="shortcut-desc">Undo</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> </span>
            <span class="shortcut-desc">Redo</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>F</kbd> </span>
            <span class="shortcut-desc">Find</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>H</kbd> </span>
            <span class="shortcut-desc">Find & Replace</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys">
              <kbd>Tab</kbd>
            </span>
            <span class="shortcut-desc">Cycle Element Types</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys">
              <kbd>Enter</kbd>
            </span>
            <span class="shortcut-desc">New Line</span>
          </div>
        </div>
      </div>

      <div class="shortcuts-section">
        <h4>Quick Formatting</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Alt</kbd> + <kbd>1</kbd> </span>
            <span class="shortcut-desc">Scene Heading</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Alt</kbd> + <kbd>2</kbd> </span>
            <span class="shortcut-desc">Action</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Alt</kbd> + <kbd>3</kbd> </span>
            <span class="shortcut-desc">Character</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Alt</kbd> + <kbd>4</kbd> </span>
            <span class="shortcut-desc">Dialogue</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Alt</kbd> + <kbd>5</kbd> </span>
            <span class="shortcut-desc">Parenthetical</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Alt</kbd> + <kbd>6</kbd> </span>
            <span class="shortcut-desc">Transition</span>
          </div>
        </div>
      </div>

      <div class="shortcuts-section">
        <h4>View</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>\</kbd> </span>
            <span class="shortcut-desc">Toggle Scene Navigator</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> </span>
            <span class="shortcut-desc">Toggle Characters tab (in sidebar)</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> </span>
            <span class="shortcut-desc">Focus Mode</span>
          </div>
        </div>
      </div>

      <div class="shortcuts-section">
        <h4>Help</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>/</kbd> </span>
            <span class="shortcut-desc">Show This Dialog</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Close" @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const visible = ref(false)

const showDialog = () => {
  visible.value = true
}

onMounted(() => {
  window.addEventListener('show-shortcuts-dialog', showDialog)
})

onUnmounted(() => {
  window.removeEventListener('show-shortcuts-dialog', showDialog)
})
</script>

<style scoped>
.shortcuts-container {
  display: flex;
  flex-direction: column;
  gap: 25px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 10px;
}

.shortcuts-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f8f8;
  border-radius: 6px;
  transition: background 0.2s;
}

.shortcut-item:hover {
  background: #f0f0f0;
}

.shortcut-keys {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 13px;
}

kbd {
  display: inline-block;
  padding: 3px 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 0 #ddd;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.shortcut-desc {
  font-size: 14px;
  color: #555;
}

:global(body.dark-mode) .shortcuts-section h4 {
  color: #aaa;
}

:global(body.dark-mode) .shortcut-item {
  background: #2a2a2a;
}

:global(body.dark-mode) .shortcut-item:hover {
  background: #333;
}

:global(body.dark-mode) kbd {
  background: #1e1e1e;
  border-color: #444;
  box-shadow: 0 2px 0 #444;
  color: #e0e0e0;
}

:global(body.dark-mode) .shortcut-desc {
  color: #ccc;
}
</style>
