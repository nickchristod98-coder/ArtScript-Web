<template>
  <aside class="sidebar scene-navigator">
    <!-- Tabs: Scenes | Characters -->
    <div class="sidebar-header">
      <div class="sidebar-tabs">
        <button
          class="tab-btn"
          :class="{ active: store.sidebarView === 'scenes' }"
          @click="store.sidebarView = 'scenes'"
        >
          {{ isBookFormat ? 'Chapters' : 'Scenes' }}
        </button>
        <button
          class="tab-btn"
          :class="{ active: store.sidebarView === 'characters' }"
          @click="store.sidebarView = 'characters'"
        >
          Characters
        </button>
      </div>
      <button
        v-if="store.sidebarView === 'scenes'"
        class="scene-showcase-btn"
        @click="showSceneShowcase = true"
        :title="isBookFormat ? 'View all chapters' : 'View all scenes'"
      >
        <span class="showcase-icon">
          <span class="icon-block"></span>
          <span class="icon-line"></span>
        </span>
      </button>
      <button
        v-if="store.sidebarView === 'characters'"
        class="scene-showcase-btn"
        @click="showAddDialog = true"
        title="Add character"
      >
        <i class="pi pi-plus"></i>
      </button>
    </div>

    <!-- Scenes view: computed from editor blocks — no own state -->
    <template v-if="store.sidebarView === 'scenes'">
      <div class="scene-list">
        <template v-for="(scene, idx) in scenes" :key="scene.id">
          <div
            class="scene-item"
            :class="getHighlightClass(scene, idx)"
            @click="scrollToScene(scene.index, scene.id)"
            @mouseenter="handleMouseEnter(scene, idx, $event)"
            @mouseleave="handleMouseLeave"
          >
          <span class="scene-number">{{ scene.number || idx + 1 }}.</span>
          <span class="scene-title">{{ scene.title }}</span>
        </div>
        </template>
      </div>
    </template>

    <!-- Characters view (same design as scene list) -->
    <template v-else>
      <div class="sidebar-search">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search characters..."
        />
      </div>
      <div class="character-list">
        <div
          v-for="char in filteredCharacters"
          :key="char.name"
          class="scene-item character-item"
          :class="{ 'last-scene': selectedCharacter?.name === char.name }"
          @click="selectCharacter(char)"
          @contextmenu.prevent="openCharacterMenu($event, char)"
        >
          <span class="scene-number">{{ char.appearances }}</span>
          <div class="character-item-body">
            <span class="scene-title character-name-text">{{ char.name }}</span>
            <span class="character-line-count">{{ char.dialogueCount }} line{{ char.dialogueCount !== 1 ? 's' : '' }}</span>
          </div>
          <button
            type="button"
            class="character-menu-btn"
            @click.stop="openCharacterMenu($event, char)"
            title="Options"
          >
            <i class="pi pi-ellipsis-v"></i>
          </button>
        </div>
        <div v-if="filteredCharacters.length === 0" class="empty-state">No characters found</div>
      </div>

      <!-- Character details (below list, same sidebar style) -->
      <div v-if="selectedCharacter" class="character-details-panel">
        <div class="details-panel-header">
          <span class="details-panel-title">{{ selectedCharacter.name }}</span>
          <button type="button" class="details-close-btn" @click="selectedCharacter = null" title="Close">×</button>
        </div>
        <div class="details-panel-content">
          <div class="detail-section">
            <label>Description</label>
            <textarea
              v-model="selectedCharacter.description"
              rows="3"
              placeholder="Character description..."
              class="detail-textarea"
              @input="saveCharacter"
            />
          </div>
          <div class="detail-section">
            <label>Notes</label>
            <textarea
              v-model="selectedCharacter.notes"
              rows="5"
              placeholder="Character notes..."
              class="detail-textarea"
              @input="saveCharacter"
            />
          </div>
          <div class="detail-section">
            <label>Aliases</label>
            <div class="aliases-row">
              <span
                v-for="(alias, index) in selectedCharacter.aliases"
                :key="index"
                class="alias-chip"
              >
                {{ alias }}
                <button type="button" class="alias-remove" @click="removeAlias(index)">×</button>
              </span>
              <input
                v-model="newAlias"
                type="text"
                class="alias-input"
                placeholder="Add alias..."
                @keydown.enter.prevent="addAlias"
              />
            </div>
          </div>
          <div class="detail-section">
            <button type="button" class="find-in-script-btn" @click="findCharacterInScript">
              <i class="pi pi-search"></i> Find in Script
            </button>
          </div>
        </div>
      </div>
    </template>
  </aside>

  <!-- Add Character Dialog -->
  <Dialog
    v-model:visible="showAddDialog"
    header="Add Character"
    :modal="true"
    :style="{ width: '360px' }"
    :dismissableMask="true"
  >
    <div class="add-char-dialog-content">
      <label>Character Name</label>
      <InputText
        v-model="newCharacterName"
        placeholder="Enter character name..."
        class="w-full"
        @keydown.enter.prevent="addCharacter"
      />
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="showAddDialog = false" />
      <Button label="Add" @click="addCharacter" />
    </template>
  </Dialog>

  <!-- Character context menu -->
  <Menu ref="characterMenu" :model="characterMenuItems" :popup="true" />

  
  <!-- Scene Preview Tooltip - Using Teleport to render outside sidebar -->
  <Teleport to="body">
    <div
      v-if="showPreview && previewContent"
      class="scene-preview-tooltip"
      :style="previewStyle"
      @mouseenter="keepPreviewVisible = true"
      @mouseleave="handleMouseLeave"
    >
      <div class="preview-header">{{ previewTitle }}</div>
      <div class="preview-content">{{ previewContent }}</div>
    </div>
  </Teleport>
  
  <!-- Scene Showcase Modal -->
  <Teleport to="body">
    <div
      v-if="showSceneShowcase"
      class="scene-showcase-overlay"
      @click="showSceneShowcase = false"
    >
      <div class="scene-showcase-container" @click.stop>
        <div class="scene-showcase-header">
          <h2>{{ isBookFormat ? 'All Chapters' : 'All Scenes' }}</h2>
          <button class="scene-showcase-close" @click="showSceneShowcase = false">×</button>
        </div>
        <div class="scene-showcase-grid">
          <template v-for="(scene, idx) in scenes" :key="scene.id">
          <div
            v-if="scene"
            class="scene-card"
            @click="navigateToScene(scene.index, scene.id)"
          >
            <div class="scene-card-top">
              <span class="scene-card-heading-number">{{ scene.number || idx + 1 }}.</span>
              <span class="scene-card-heading-title">{{ scene.title }}</span>
            </div>
            <div class="scene-card-content">
              <div 
                v-for="(previewLine, lineIdx) in getScenePreview(scene.index)"
                :key="lineIdx"
                class="scene-preview-line"
                :class="`preview-${previewLine.type}`"
              >
                {{ previewLine.content }}
              </div>
            </div>
          </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, watch, ref, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import Menu from 'primevue/menu'

const emit = defineEmits(['find-character', 'scene-selected'])
const store = useProjectStore()

// --- Character panel state (from CharacterManager) ---
const searchQuery = ref('')
const selectedCharacter = ref(null)
const showAddDialog = ref(false)
const newCharacterName = ref('')
const newAlias = ref('')
const characterMenu = ref(null)
const contextCharacter = ref(null)

// Check if Book format
const isBookFormat = computed(() => store.activeProject?.format === 'Book')

// Preview tooltip state
const showPreview = ref(false)
const previewContent = ref('')
const previewTitle = ref('')
const previewStyle = ref({})
const keepPreviewVisible = ref(false)
let hoverTimeout = null
let currentSceneIndex = null

// Scene showcase modal state
const showSceneShowcase = ref(false)

// Single source of truth: scenes = computed from editor blocks (project.lines).
// Navigator has NO own state. Only blocks with type scene-heading and non-empty content appear.
const scenes = computed(() => store.activeScenes || [])

// Determine which scene should be highlighted
// If selectedSceneId is set, highlight that; otherwise highlight last scene
const getHighlightClass = (scene, idx) => {
  const list = scenes.value
  const isLastScene = idx === list.length - 1
  const isSelected = store.selectedSceneId === scene.id

  return (isSelected || (!store.selectedSceneId && isLastScene)) ? 'last-scene' : ''
}

const scrollToScene = (index, sceneId) => {
  // Set the selected scene
  store.selectedSceneId = sceneId
  
  // Emit for parent (e.g. to close mobile popup)
  emit('scene-selected', index)
  
  // Emit event to scroll to scene
  window.dispatchEvent(new CustomEvent('scroll-to-scene', { detail: { lineIndex: index } }))
}

// Navigate to scene from showcase
const navigateToScene = (index, sceneId) => {
  scrollToScene(index, sceneId)
  showSceneShowcase.value = false
}

// Get preview lines for a scene (4-5 lines)
const getScenePreview = (sceneIndex) => {
  try {
    if (!store.activeProject) return []
    const lines = store.getLinesForScene(sceneIndex)
    if (!lines || lines.length === 0) return []
    
    // Filter out scene heading itself and get 4-5 content lines
    const contentLines = lines
      .filter(line => line.type !== 'scene-heading' && line.content.trim())
      .slice(0, 5)
    
    return contentLines.map(line => ({
      type: line.type,
      content: line.content.trim()
    }))
  } catch (error) {
    console.error('Error getting scene preview:', error)
    return []
  }
}

// Get lines for a scene using store method
const getSceneLines = (sceneIndex) => {
  try {
    if (!store.activeProject) {
      console.log('No active project')
      return []
    }
    const lines = store.getLinesForScene(sceneIndex)
    console.log('Got lines for scene:', sceneIndex, 'lines count:', lines?.length)
    return lines || []
  } catch (error) {
    console.error('Error getting scene lines:', error)
    return []
  }
}

// Format preview content
const formatPreviewContent = (lines) => {
  if (!lines || lines.length === 0) return 'No content'
  
  // Get first few lines (max 10 lines or ~300 characters)
  let content = ''
  let charCount = 0
  const maxChars = 300
  const maxLines = 10
  
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    const line = lines[i]
    if (!line || !line.content) continue
    
    const lineText = line.content.trim()
    if (lineText) {
      if (charCount + lineText.length > maxChars) {
        content += lineText.substring(0, maxChars - charCount) + '...'
        break
      }
      content += lineText + '\n'
      charCount += lineText.length
    }
  }
  
  return content.trim() || 'No content'
}

// Handle mouse enter with 2 second delay
const handleMouseEnter = (scene, idx, event) => {
  // Clear any existing timeout
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
  }
  
  currentSceneIndex = scene.index
  keepPreviewVisible.value = false
  
  // Set timeout for 2 seconds
  hoverTimeout = setTimeout(() => {
    try {
      const lines = getSceneLines(scene.index)
      const content = formatPreviewContent(lines)
      
      if (!content || content === 'No content') {
        console.log('No content found for scene:', scene)
        return
      }
      
      previewTitle.value = scene.title || 'Untitled Scene'
      previewContent.value = content
      
      // Position tooltip to the right of the scene item
      const rect = event.currentTarget.getBoundingClientRect()
      
      previewStyle.value = {
        top: `${rect.top}px`,
        left: `${rect.right + 10}px`,
      }
      
      showPreview.value = true
      console.log('Preview shown:', { title: previewTitle.value, content: previewContent.value.substring(0, 50) })
    } catch (error) {
      console.error('Error showing preview:', error)
    }
  }, 2000)
}

// Handle mouse leave
const handleMouseLeave = () => {
  keepPreviewVisible.value = false
  
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }
  
  // Small delay before hiding to allow moving to tooltip
  setTimeout(() => {
    if (!keepPreviewVisible.value) {
      showPreview.value = false
      previewContent.value = ''
      previewTitle.value = ''
      currentSceneIndex = null
    }
  }, 100)
}

// --- Character computed and methods ---
const characters = computed(() => {
  if (!store.activeProject) return []
  const charMap = new Map()
  store.activeProject.lines.forEach((line, index) => {
    if (line.type === 'character') {
      const name = line.content.trim().toUpperCase()
      if (!name) return
      if (!charMap.has(name)) {
        charMap.set(name, {
          name,
          appearances: 0,
          dialogueCount: 0,
          scenes: new Set(),
          description: '',
          notes: '',
          aliases: [],
        })
      }
      const char = charMap.get(name)
      char.appearances++
      if (index + 1 < store.activeProject.lines.length && store.activeProject.lines[index + 1].type === 'dialogue') {
        char.dialogueCount++
      }
      for (let i = index; i >= 0; i--) {
        if (store.activeProject.lines[i].type === 'scene-heading') {
          char.scenes.add(i)
          break
        }
      }
    }
  })
  const savedChars = store.activeProject.characterData || {}
  return Array.from(charMap.values()).map((char) => ({
    ...char,
    scenes: char.scenes.size,
    ...(savedChars[char.name] || {}),
  }))
})

const filteredCharacters = computed(() => {
  if (!searchQuery.value) return characters.value
  const query = searchQuery.value.toLowerCase()
  return characters.value.filter((char) => char.name.toLowerCase().includes(query))
})

const characterMenuItems = computed(() => [
  {
    label: 'Edit Details',
    icon: 'pi pi-pencil',
    command: () => {
      selectedCharacter.value = contextCharacter.value ? { ...contextCharacter.value } : null
    },
  },
  {
    label: 'Find in Script',
    icon: 'pi pi-search',
    command: () => findCharacterInScript(contextCharacter.value),
  },
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => deleteCharacter(contextCharacter.value),
  },
])

function selectCharacter(character) {
  selectedCharacter.value = { ...character }
  // Table Read: highlight this character's dialogue when in Read Mode
  if (store.isReadMode) {
    store.setHighlightedCharacterForRead(character.name)
  }
}

function saveCharacter() {
  if (!selectedCharacter.value) return
  if (!store.activeProject.characterData) store.activeProject.characterData = {}
  store.activeProject.characterData[selectedCharacter.value.name] = {
    description: selectedCharacter.value.description,
    notes: selectedCharacter.value.notes,
    aliases: selectedCharacter.value.aliases || [],
  }
  store.activeProject.characterData = { ...store.activeProject.characterData }
}

function addCharacter() {
  if (!newCharacterName.value.trim()) return
  const name = newCharacterName.value.trim().toUpperCase()
  if (!store.activeProject.characterData) store.activeProject.characterData = {}
  store.activeProject.characterData[name] = { description: '', notes: '', aliases: [] }
  store.activeProject.characterData = { ...store.activeProject.characterData }
  newCharacterName.value = ''
  showAddDialog.value = false
}

function addAlias() {
  if (!newAlias.value.trim() || !selectedCharacter.value) return
  if (!selectedCharacter.value.aliases) selectedCharacter.value.aliases = []
  selectedCharacter.value.aliases.push(newAlias.value.trim().toUpperCase())
  newAlias.value = ''
  saveCharacter()
}

function removeAlias(index) {
  if (!selectedCharacter.value) return
  selectedCharacter.value.aliases.splice(index, 1)
  saveCharacter()
}

function findCharacterInScript(character = selectedCharacter.value) {
  if (!character) return
  emit('find-character', character.name)
}

function deleteCharacter(character) {
  if (!store.activeProject?.characterData) return
  delete store.activeProject.characterData[character.name]
  store.activeProject.characterData = { ...store.activeProject.characterData }
  if (selectedCharacter.value?.name === character.name) selectedCharacter.value = null
}

function openCharacterMenu(event, character) {
  contextCharacter.value = character
  characterMenu.value.show(event)
}

// Watch for new scenes - reset selection when a new scene is created
watch(() => store.activeScenes.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    store.selectedSceneId = null
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (hoverTimeout) clearTimeout(hoverTimeout)
})
</script>

<style scoped>
.sidebar {
  width: 280px;
  background-color: #f8f8f8;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
}
.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background-color: #fff;
  transition: background-color 0.3s ease, border-color 0.3s ease;
  position: relative;
}

.sidebar-tabs {
  display: flex;
  gap: 4px;
  flex: 1;
}

.tab-btn {
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #333;
  background: #f0f0f0;
}

.tab-btn.active {
  color: #333;
  background: #e8e8e8;
  font-weight: 600;
}

.sidebar-search {
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}

.search-input:focus {
  border-color: #999;
}

.character-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.character-item {
  position: relative;
  padding-right: 36px;
  align-items: flex-start;
}

.character-item .scene-number {
  min-width: 24px;
  font-size: 12px;
  color: #888;
  padding-top: 2px;
}

.character-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.character-name-text {
  font-weight: 600;
  color: #333;
}

.character-line-count {
  font-size: 11px;
  color: #888;
  line-height: 1.2;
}

.character-menu-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.character-menu-btn:hover {
  background: #e8e8e8;
  color: #333;
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: #999;
}

.character-details-panel {
  border-top: 1px solid #ddd;
  background: #fafafa;
  max-height: 45%;
  overflow-y: auto;
  flex-shrink: 0;
}

.details-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.details-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.details-close-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  border-radius: 4px;
}

.details-close-btn:hover {
  background: #eee;
  color: #333;
}

.details-panel-content {
  padding: 12px 16px;
}

.detail-section {
  margin-bottom: 14px;
}

.detail-section label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 6px;
}

.detail-textarea {
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
  outline: none;
}

.detail-textarea:focus {
  border-color: #999;
}

.aliases-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.alias-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  background: #e8e8e8;
  border-radius: 6px;
  color: #333;
}

.alias-remove {
  padding: 0;
  border: none;
  background: none;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.alias-remove:hover {
  color: #c00;
}

.alias-input {
  flex: 1;
  min-width: 80px;
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}

.find-in-script-btn {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.find-in-script-btn:hover {
  background: #f5f5f5;
  border-color: #999;
}

.add-char-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-char-dialog-content label {
  font-weight: 600;
  font-size: 13px;
}

.add-char-dialog-content .w-full {
  width: 100%;
}
.scene-list {
  overflow-y: auto;
  flex: 1;
  background: transparent;
}
.scene-item {
  padding: 12px 15px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 44px;
  transition: background-color 0.2s ease;
}

.scene-item:hover {
  background: #f0f0f0;
}
.scene-item.last-scene {
  border-left: 2px solid #999;
  background: #e0e0e0;
}
.scene-item.last-scene:hover {
  background: #f0f0f0;
}
.scene-number {
  color: #666;
  font-weight: 600;
  font-size: 0.9rem;
  min-width: 28px;
  flex-shrink: 0;
  display: inline-block;
}
.scene-count {
    background-color: #666;
    color: white;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 300;
    transition: background-color 0.3s ease;
}
.scene-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #555;
  font-family: 'Courier New', monospace;
}

.scene-showcase-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 16px;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0.7;
  width: 24px;
  height: 24px;
}

.showcase-icon {
  position: relative;
  width: 14px;
  height: 14px;
  display: inline-block;
}

.icon-block {
  position: absolute;
  top: 0;
  left: 0;
  width: 14px;
  height: 14px;
  border: 1px solid currentColor;
  border-radius: 2px;
}

.icon-line {
  position: absolute;
  top: 50%;
  left: 2px;
  right: 2px;
  height: 1px;
  background: currentColor;
  transform: translateY(-50%);
}

.scene-showcase-btn:hover {
  background: #f0f0f0;
  opacity: 1;
  color: #333;
}

body.dark-mode .scene-showcase-btn {
  color: #999;
}

body.dark-mode .scene-showcase-btn:hover {
  background: #333;
  color: #e0e0e0;
}

body.dark-mode .tab-btn {
  color: #999;
}

body.dark-mode .tab-btn:hover {
  color: #e0e0e0;
  background: #333;
}

body.dark-mode .tab-btn.active {
  color: #e0e0e0;
  background: #333;
}

body.dark-mode .sidebar-search .search-input {
  background: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

body.dark-mode .character-name-text {
  color: #e0e0e0;
}

body.dark-mode .character-line-count {
  color: #888;
}

body.dark-mode .character-menu-btn:hover {
  background: #333;
  color: #e0e0e0;
}

body.dark-mode .empty-state {
  color: #666;
}

body.dark-mode .character-details-panel {
  background: #1a1a1a;
  border-top-color: #444;
}

body.dark-mode .details-panel-header {
  border-bottom-color: #333;
}

body.dark-mode .details-panel-title {
  color: #e0e0e0;
}

body.dark-mode .details-close-btn:hover {
  background: #333;
  color: #e0e0e0;
}

body.dark-mode .detail-section label {
  color: #999;
}

body.dark-mode .detail-textarea {
  background: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

body.dark-mode .alias-chip {
  background: #333;
  color: #e0e0e0;
}

body.dark-mode .alias-input {
  background: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

body.dark-mode .find-in-script-btn {
  background: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

body.dark-mode .find-in-script-btn:hover {
  background: #333;
  border-color: #666;
}
</style>

<style>
/* Dark Mode - Global styles to ensure they work */
body.dark-mode .sidebar,
body.dark-mode .scene-navigator {
  background-color: #252525 !important;
  background: #252525 !important;
  border-right-color: #444;
}

body.dark-mode .sidebar-header {
  border-bottom-color: #444;
  background-color: transparent !important;
}

body.dark-mode .sidebar-header h3 {
  color: #f5f5f5 !important;
  font-weight: 300;
}

body.dark-mode .scene-item {
  color: #f5f5f5 !important;
  border-bottom-color: #333;
}

body.dark-mode .scene-item:hover {
  background: #2a2a2a !important;
}

body.dark-mode .scene-item.last-scene {
  border-left-color: #777;
  background: #181818 !important;
}

body.dark-mode .scene-item.last-scene:hover {
  background: #252525 !important;
}

body.dark-mode .scene-number {
  color: #ccc !important;
}

body.dark-mode .scene-title {
  color: #f5f5f5 !important;
}

/* Scene Preview Tooltip */
.scene-preview-tooltip {
  position: fixed !important;
  background: white !important;
  border: 1px solid #ddd !important;
  border-radius: 6px !important;
  padding: 12px 16px !important;
  max-width: 400px !important;
  max-height: 300px !important;
  overflow-y: auto !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  z-index: 99999 !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  animation: fadeInTooltip 0.2s ease !important;
  pointer-events: auto !important;
  display: block !important;
}

@keyframes fadeInTooltip {
  from {
    opacity: 0;
    transform: translateX(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.preview-header {
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.preview-content {
  color: #666;
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

body.dark-mode .scene-preview-tooltip {
  background: #2a2a2a;
  border-color: #555;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

body.dark-mode .preview-header {
  color: #e0e0e0;
  border-bottom-color: #444;
}

body.dark-mode .preview-content {
  color: #ccc;
}

/* Scene Showcase Modal */
.scene-showcase-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  animation: fadeIn 0.3s ease;
}

body.dark-mode .scene-showcase-overlay {
  background: rgba(0, 0, 0, 0.85);
}

.scene-showcase-container {
  width: 90%;
  height: 90%;
  max-width: 1400px;
  max-height: 900px;
  background: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

body.dark-mode .scene-showcase-container {
  background: #2a2a2a;
}

.scene-showcase-header {
  padding: 24px 32px;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

body.dark-mode .scene-showcase-header {
  border-bottom-color: #444;
}

.scene-showcase-header h2 {
  font-size: 24px;
  font-weight: 300;
  color: #333;
  margin: 0;
}

body.dark-mode .scene-showcase-header h2 {
  color: #e0e0e0;
}

.scene-showcase-close {
  background: transparent;
  border: none;
  font-size: 28px;
  color: #666;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.scene-showcase-close:hover {
  background: #f0f0f0;
  color: #333;
}

body.dark-mode .scene-showcase-close {
  color: #999;
}

body.dark-mode .scene-showcase-close:hover {
  background: #333;
  color: #e0e0e0;
}

.scene-showcase-grid {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  align-content: start;
}

.scene-card {
  aspect-ratio: 4 / 3;
  background: #f8f8f8;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  gap: 12px;
}

.scene-card:hover {
  background: #f0f0f0;
  border-color: #999;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

body.dark-mode .scene-card {
  background: #1a1a1a;
  border-color: #444;
}

body.dark-mode .scene-card:hover {
  background: #252525;
  border-color: #666;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.scene-card-top {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-shrink: 0;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

body.dark-mode .scene-card-top {
  border-bottom-color: #444;
}

.scene-card-heading-number {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  line-height: 1;
  flex-shrink: 0;
}

body.dark-mode .scene-card-heading-number {
  color: #999;
}

.scene-card-heading-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
}

body.dark-mode .scene-card-heading-title {
  color: #e0e0e0;
}

.scene-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.scene-preview-line {
  font-size: 11px;
  line-height: 1.4;
  color: #666;
  font-family: 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

body.dark-mode .scene-preview-line {
  color: #aaa;
}

.scene-preview-line.preview-character {
  font-weight: 600;
  color: #333;
}

body.dark-mode .scene-preview-line.preview-character {
  color: #e0e0e0;
}

.scene-preview-line.preview-dialogue {
  padding-left: 20px;
  color: #555;
}

body.dark-mode .scene-preview-line.preview-dialogue {
  color: #ccc;
}

.scene-preview-line.preview-action {
  color: #666;
}

body.dark-mode .scene-preview-line.preview-action {
  color: #aaa;
}

.scene-preview-line.preview-parenthetical {
  padding-left: 16px;
  font-style: italic;
  color: #777;
}

body.dark-mode .scene-preview-line.preview-parenthetical {
  color: #999;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
