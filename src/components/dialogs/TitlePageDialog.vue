<template>
  <Dialog
    v-model:visible="visible"
    header="Title Page Editor"
    :modal="true"
    class="title-page-dialog"
    :style="{ width: '50vw' }"
    data-training="title-page-dialog"
  >
    <div class="field-container">
      <!-- TV Show Format -->
      <template v-if="isTVShow">
        <!-- Series Title (Static) -->
        <div class="field" data-training="title-page-field-title">
          <label>Series Title</label>
          <InputText 
            v-model="titlePage.title" 
            class="w-full" 
            placeholder="SERIES TITLE" 
            :disabled="false"
          />
          <small class="field-hint">This title applies to all episodes</small>
        </div>

        <!-- Episode Number (Read-only, auto-generated) -->
        <div class="field">
          <label>Episode Number</label>
          <InputText 
            :value="episodeNumber" 
            class="w-full" 
            disabled
          />
          <small class="field-hint">Automatically generated from active episode</small>
        </div>

        <!-- Episode Title (Dynamic, per episode) -->
        <div class="field" data-training="title-page-field-episode-title">
          <label>Episode Title</label>
          <InputText 
            v-model="activeEpisodeTitlePage.episodeTitle" 
            class="w-full" 
            placeholder="THE PILOT" 
          />
          <small class="field-hint">Title specific to this episode</small>
        </div>
      </template>

      <!-- Film/Book Format (Original) -->
      <template v-else>
        <div class="field" data-training="title-page-field-title">
          <label>Title</label>
          <InputText v-model="titlePage.title" class="w-full" placeholder="SCRIPT TITLE" />
        </div>
      </template>

      <!-- Common Fields -->
      <div class="field" data-training="title-page-field-credit">
        <label>Credit</label>
        <InputText v-model="titlePage.credit" class="w-full" placeholder="by" />
      </div>

      <div class="field" data-training="title-page-field-author">
        <label>Author</label>
        <InputText v-model="titlePage.author" class="w-full" placeholder="Author Name" />
      </div>

      <div class="field" data-training="title-page-field-draft">
        <label>Draft / Version</label>
        <InputText v-model="titlePage.draft" class="w-full" placeholder="Draft 1.0" />
      </div>

      <div class="field" data-training="title-page-field-contact">
        <label>Contact Info</label>
        <Textarea v-model="titlePage.contact" rows="3" class="w-full" />
      </div>
    </div>

    <template #footer>
      <Button label="Close" icon="pi pi-check" data-training="title-page-close" @click="saveAndClose" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'

const props = defineProps(['visible'])
const emit = defineEmits(['update:visible'])

const store = useProjectStore()

// Check if TV Show format
const isTVShow = computed(() => store.activeProject?.format === 'TV Show')

// Safe binding to active project title page (Series level)
const titlePage = computed(() => {
  return store.activeProject ? store.activeProject.titlePage : {}
})

// Get active episode's title page (Episode level)
const activeEpisodeTitlePage = computed({
  get: () => {
    if (!isTVShow.value || !store.activeProject) return { episodeTitle: '' }
    
    const season = store.activeProject.seasons[store.activeProject.activeSeasonIndex]
    if (!season) return { episodeTitle: '' }
    
    const episode = season.episodes.find((e) => e.id === store.activeProject.activeEpisodeId)
    if (!episode) return { episodeTitle: '' }
    
    // Initialize titlePage if it doesn't exist
    if (!episode.titlePage) {
      episode.titlePage = { episodeTitle: '' }
    }
    
    return episode.titlePage
  },
  set: (value) => {
    if (!isTVShow.value || !store.activeProject) return
    
    const season = store.activeProject.seasons[store.activeProject.activeSeasonIndex]
    if (!season) return
    
    const episode = season.episodes.find((e) => e.id === store.activeProject.activeEpisodeId)
    if (episode) {
      if (!episode.titlePage) {
        episode.titlePage = { episodeTitle: '' }
      }
      episode.titlePage.episodeTitle = value.episodeTitle
    }
  }
})

// Calculate episode number (S01E01 format)
const episodeNumber = computed(() => {
  if (!isTVShow.value || !store.activeProject) return ''
  
  const season = store.activeProject.seasons[store.activeProject.activeSeasonIndex]
  if (!season) return ''
  
  const episode = season.episodes.find((e) => e.id === store.activeProject.activeEpisodeId)
  if (!episode) return ''
  
  const episodeIndex = season.episodes.findIndex((e) => e.id === episode.id)
  const seasonNum = String(season.seasonNumber).padStart(2, '0')
  const episodeNum = String(episodeIndex + 1).padStart(2, '0')
  
  return `S${seasonNum}E${episodeNum}`
})

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const saveAndClose = () => {
  visible.value = false
}
</script>

<style scoped>
.field {
  margin-bottom: 1.5rem;
}
.field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}
.field-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}
.w-full {
  width: 100%;
}

:global(body.dark-mode) .field label {
  color: #ccc;
}
:global(body.dark-mode) .field-hint {
  color: #999;
}
</style>
