<!-- src/components/panels/CharacterManager.vue -->
<template>
  <div class="character-manager">
    <div class="manager-header">
      <h3>Characters</h3>
      <Button
        icon="pi pi-plus"
        severity="secondary"
        text
        rounded
        @click="showAddDialog = true"
        title="Add Character"
      />
    </div>

    <div class="search-box">
      <InputText v-model="searchQuery" placeholder="Search characters..." class="w-full" />
    </div>

    <div class="character-list">
      <div
        v-for="character in filteredCharacters"
        :key="character.name"
        class="character-item"
        @click="selectCharacter(character)"
        :class="{ active: selectedCharacter?.name === character.name }"
      >
        <div class="character-info">
          <div class="character-name">{{ character.name }}</div>
          <div class="character-stats">
            {{ character.appearances }} scene{{ character.appearances !== 1 ? 's' : '' }} ·
            {{ character.dialogueCount }} line{{ character.dialogueCount !== 1 ? 's' : '' }}
          </div>
        </div>
        <Button
          icon="pi pi-ellipsis-v"
          severity="secondary"
          text
          rounded
          @click.stop="openCharacterMenu($event, character)"
        />
      </div>

      <div v-if="filteredCharacters.length === 0" class="empty-state">No characters found</div>
    </div>

    <!-- Character Details Panel -->
    <div v-if="selectedCharacter" class="character-details">
      <div class="details-header">
        <h4>{{ selectedCharacter.name }}</h4>
        <Button
          icon="pi pi-times"
          severity="secondary"
          text
          rounded
          @click="selectedCharacter = null"
        />
      </div>

      <div class="details-content">
        <div class="detail-section">
          <label>Description</label>
          <Textarea
            v-model="selectedCharacter.description"
            rows="3"
            placeholder="Character description..."
            class="w-full"
            @input="saveCharacter"
          />
        </div>

        <div class="detail-section">
          <label>Notes</label>
          <Textarea
            v-model="selectedCharacter.notes"
            rows="5"
            placeholder="Character notes..."
            class="w-full"
            @input="saveCharacter"
          />
        </div>

        <div class="detail-section">
          <label>Aliases</label>
          <div class="aliases-list">
            <Chip
              v-for="(alias, index) in selectedCharacter.aliases"
              :key="index"
              :label="alias"
              removable
              @remove="removeAlias(index)"
            />
            <InputText
              v-model="newAlias"
              placeholder="Add alias..."
              @keydown.enter="addAlias"
              size="small"
            />
          </div>
        </div>

        <div class="detail-section">
          <Button
            label="Find in Script"
            icon="pi pi-search"
            @click="findCharacterInScript"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- Add Character Dialog -->
    <Dialog
      v-model:visible="showAddDialog"
      header="Add Character"
      :modal="true"
      :dismissableMask="true"
    >
      <div class="dialog-content">
        <div class="field">
          <label>Character Name</label>
          <InputText
            v-model="newCharacterName"
            placeholder="Enter character name..."
            class="w-full"
            @keydown.enter="addCharacter"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" text @click="showAddDialog = false" />
        <Button label="Add" @click="addCharacter" />
      </template>
    </Dialog>

    <!-- Context Menu -->
    <Menu ref="characterMenu" :model="menuItems" :popup="true" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dialog from 'primevue/dialog'
import Chip from 'primevue/chip'
import Menu from 'primevue/menu'

const emit = defineEmits(['find-character'])

const store = useProjectStore()
const searchQuery = ref('')
const selectedCharacter = ref(null)
const showAddDialog = ref(false)
const newCharacterName = ref('')
const newAlias = ref('')
const characterMenu = ref(null)
const contextCharacter = ref(null)

// Strip (Cont'd) / (CONT'D) etc. so same character is not duplicated in sidebar
const stripContd = (text) => {
  return text.replace(/\s*\(CONT'D\)\s*$/i, '').trim()
}

// Build character database from script
const characters = computed(() => {
  if (!store.activeProject) return []

  const charMap = new Map()

  store.activeProject.lines.forEach((line, index) => {
    if (line.type === 'character') {
      const rawName = line.content.trim()
      const name = stripContd(rawName).toUpperCase()
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

      // Count dialogue lines (each character cue, including Cont'd, counts toward their line number)
      if (
        index + 1 < store.activeProject.lines.length &&
        store.activeProject.lines[index + 1].type === 'dialogue'
      ) {
        char.dialogueCount++
      }

      // Track scene appearances
      for (let i = index; i >= 0; i--) {
        if (store.activeProject.lines[i].type === 'scene-heading') {
          char.scenes.add(i)
          break
        }
      }
    }
  })

  // Load saved character data
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

const menuItems = computed(() => [
  {
    label: 'Edit Details',
    icon: 'pi pi-pencil',
    command: () => {
      selectedCharacter.value = contextCharacter.value
    },
  },
  {
    label: 'Find in Script',
    icon: 'pi pi-search',
    command: () => {
      findCharacterInScript(contextCharacter.value)
    },
  },
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => {
      deleteCharacter(contextCharacter.value)
    },
  },
])

const selectCharacter = (character) => {
  selectedCharacter.value = { ...character }
}

const saveCharacter = () => {
  if (!selectedCharacter.value) return

  if (!store.activeProject.characterData) {
    store.activeProject.characterData = {}
  }

  store.activeProject.characterData[selectedCharacter.value.name] = {
    description: selectedCharacter.value.description,
    notes: selectedCharacter.value.notes,
    aliases: selectedCharacter.value.aliases,
  }

  // Force reactivity update
  store.activeProject.characterData = { ...store.activeProject.characterData }
}

const addCharacter = () => {
  if (!newCharacterName.value.trim()) return

  const name = newCharacterName.value.trim().toUpperCase()

  // Initialize characterData if not exists
  if (!store.activeProject.characterData) {
    store.activeProject.characterData = {}
  }

  // Add character with empty profile
  store.activeProject.characterData[name] = {
    description: '',
    notes: '',
    aliases: [],
  }

  // Force reactivity update
  store.activeProject.characterData = { ...store.activeProject.characterData }

  newCharacterName.value = ''
  showAddDialog.value = false
}

const addAlias = () => {
  if (!newAlias.value.trim() || !selectedCharacter.value) return

  if (!selectedCharacter.value.aliases) {
    selectedCharacter.value.aliases = []
  }

  selectedCharacter.value.aliases.push(newAlias.value.trim().toUpperCase())
  newAlias.value = ''
  saveCharacter()
}

const removeAlias = (index) => {
  if (!selectedCharacter.value) return
  selectedCharacter.value.aliases.splice(index, 1)
  saveCharacter()
}

const findCharacterInScript = (character = selectedCharacter.value) => {
  if (!character) return
  emit('find-character', character.name)
}

const deleteCharacter = (character) => {
  if (!store.activeProject.characterData) return
  delete store.activeProject.characterData[character.name]
}

const openCharacterMenu = (event, character) => {
  contextCharacter.value = character
  characterMenu.value.show(event)
}
</script>

<style scoped>
.character-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-right: 1px solid #e0e0e0;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.manager-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.search-box {
  padding: 10px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.w-full {
  width: 100%;
}

.character-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.character-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 5px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.character-item:hover {
  background: #f5f5f5;
}

.character-item.active {
  background: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.character-info {
  flex: 1;
}

.character-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.character-stats {
  font-size: 12px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.character-details {
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  max-height: 50%;
  overflow-y: auto;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.details-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.details-content {
  padding: 20px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #666;
}

.aliases-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.dialog-content {
  padding: 10px 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-weight: 600;
  font-size: 14px;
}

:global(body.dark-mode) .character-manager {
  background: #1a1a1a;
  border-color: #333;
}

:global(body.dark-mode) .manager-header {
  border-color: #333;
}

:global(body.dark-mode) .search-box {
  border-color: #333;
}

:global(body.dark-mode) .character-item:hover {
  background: #2a2a2a;
}

:global(body.dark-mode) .character-item.active {
  background: #1e3a5f;
}

:global(body.dark-mode) .character-stats {
  color: #999;
}

:global(body.dark-mode) .character-details {
  background: #252525;
  border-color: #333;
}

:global(body.dark-mode) .details-header {
  border-color: #333;
}
</style>
