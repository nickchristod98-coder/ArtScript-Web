<template>
  <div class="script-line" :data-type="line.type">
    <span v-if="showSceneNumber" class="scene-number" contenteditable="false">{{
      sceneNumber
    }}</span>

    <div
      class="line-content"
      contenteditable="true"
      @input="onInput"
      @keydown="onKeydown"
      @focus="$emit('focus')"
      ref="contentEl"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  line: Object,
  index: Number,
  sceneNumber: Number,
  showSceneNumber: Boolean,
})

const emit = defineEmits(['update', 'keydown', 'focus'])
const contentEl = ref(null)

// Initialize text
onMounted(() => {
  if (contentEl.value) contentEl.value.innerText = props.line.content
})

// Watch for external changes (Undo/Redo)
watch(
  () => props.line.content,
  (newVal) => {
    if (contentEl.value && contentEl.value.innerText !== newVal) {
      contentEl.value.innerText = newVal
    }
  },
)

const onInput = (e) => {
  emit('update', { id: props.line.id, content: e.target.innerText })
}

const onKeydown = (e) => {
  emit('keydown', e, props.line)
}

const focus = () => {
  if (!contentEl.value) return
  contentEl.value.focus()

  // Move cursor to end
  const range = document.createRange()
  const sel = window.getSelection()
  range.selectNodeContents(contentEl.value)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}

defineExpose({ focus })
</script>
