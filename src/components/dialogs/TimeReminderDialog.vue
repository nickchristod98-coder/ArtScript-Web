<template>
  <Dialog v-model:visible="visible" header="Time Reminder" :modal="true" :style="{ width: '30vw' }">
    <div class="field-container">
      <div class="field">
        <label>Date:</label>
        <InputText type="date" v-model="date" :min="minDate" class="w-full" />
      </div>
      <div class="field">
        <label>Time (optional):</label>
        <InputText type="time" v-model="time" class="w-full" />
      </div>
      <div class="field">
        <label>Note:</label>
        <Textarea v-model="note" rows="3" class="w-full" placeholder="Add a note..." />
      </div>
    </div>

    <template #footer>
      <Button
        v-if="store.activeProject?.deadline"
        label="Clear"
        severity="danger"
        text
        @click="clearReminder"
      />
      <div class="spacer"></div>
      <Button label="Cancel" text @click="visible = false" />
      <Button label="Set Reminder" @click="saveReminder" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

const props = defineProps(['visible'])
const emit = defineEmits(['update:visible'])
const store = useProjectStore()

const date = ref('')
const time = ref('')
const note = ref('')

// Set minimum date to today
const today = new Date()
const minDate = today.toISOString().split('T')[0]

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

// Load existing data when opening
watch(visible, (newVal) => {
  if (newVal && store.activeProject?.deadline) {
    date.value = store.activeProject.deadline.date || ''
    time.value = store.activeProject.deadline.time || ''
    note.value = store.activeProject.deadline.note || ''
  } else if (newVal) {
    date.value = ''
    time.value = ''
    note.value = ''
  }
})

const saveReminder = () => {
  if (!store.activeProject || !date.value) return
  
  // Validate that date is in the future
  const selectedDate = new Date(date.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  selectedDate.setHours(0, 0, 0, 0)
  
  if (selectedDate <= today) {
    alert('Please select a date in the future.')
    return
  }
  
  store.activeProject.deadline = {
    date: date.value,
    time: time.value,
    note: note.value,
  }
  visible.value = false
}

const clearReminder = () => {
  if (store.activeProject) store.activeProject.deadline = null
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
.spacer {
  flex: 1;
}

:global(body.dark-mode) .field label {
  color: #ccc;
}
</style>
