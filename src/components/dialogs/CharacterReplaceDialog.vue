<template>
  <Dialog
    v-model:visible="visible"
    header="Character Replace"
    :modal="true"
    :style="{ width: '30vw' }"
  >
    <div class="field-container">
      <div class="field">
        <label>Select Character to Replace:</label>
        <Dropdown
          v-model="selectedChar"
          :options="characterList"
          placeholder="-- Select Character --"
          class="w-full"
        />
      </div>

      <div class="field">
        <label>New Character Name:</label>
        <InputText v-model="newCharName" class="w-full" placeholder="NEW NAME" />
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" class="p-button-text" @click="visible = false" />
      <Button label="Replace" icon="pi pi-check" @click="replaceCharacter" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'

const props = defineProps(['visible'])
const emit = defineEmits(['update:visible'])
const store = useProjectStore()

const selectedChar = ref('')
const newCharName = ref('')

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const characterList = computed(() => {
  if (!store.activeProject) return []
  return Array.from(store.activeProject.characters).sort()
})

const replaceCharacter = () => {
  if (!selectedChar.value || !newCharName.value) return

  // Iterate through all lines and replace
  store.activeProject.lines.forEach((line) => {
    if (line.type === 'character' && line.content.trim() === selectedChar.value) {
      line.content = newCharName.value.toUpperCase()
    }
  })

  // Update Set
  store.activeProject.characters.delete(selectedChar.value)
  store.activeProject.characters.add(newCharName.value.toUpperCase())

  visible.value = false
}
</script>

<style scoped>
.field {
  margin-bottom: 1rem;
}
.field label {
  color: inherit;
}
.w-full {
  width: 100%;
}

:global(body.dark-mode) .field label {
  color: #ccc;
}
</style>
