<template>
  <div class="launch-menu-overlay">
    <!-- Title - Independent, appears first -->
    <div 
      class="title-wrapper"
      :class="{ 
        'title-centered': !titleSlid, 
        'title-left': titleSlid,
        'title-visible': titleVisible
      }"
    >
      <h1 class="launch-menu-title">
        <span class="typed-text">{{ displayedText }}</span>
        <span class="cursor-marker"></span>
      </h1>
      <p 
        class="title-credit"
        :class="{ 'visible': showCredit }"
      >
        Created by Nick Christod
      </p>
    </div>

    <!-- Containers - Revealed after title slides -->
    <div class="launch-menu-container" :class="{ 'visible': containersVisible }">
      <!-- Left Container: Title placeholder -->
      <div class="launch-menu-left">
      </div>

      <!-- Right Container: Actions -->
      <div class="launch-menu-right">
        <div class="launch-menu-section">
          <h2>Create New Project</h2>
          <div class="launch-menu-formats">
            <button class="launch-format-btn" @click="start('Film')">
              <i class="pi pi-video format-icon"></i>
              <span class="format-name">Film</span>
            </button>
            <button class="launch-format-btn" @click="start('TV Show')">
              <i class="pi pi-desktop format-icon"></i>
              <span class="format-name">TV Show</span>
            </button>
            <button class="launch-format-btn format-disabled" disabled>
              <i class="pi pi-book format-icon"></i>
              <span class="format-name">Book</span>
              <span class="coming-soon">Coming soon</span>
            </button>
          </div>
        </div>

        <div class="launch-menu-section">
          <input
            type="file"
            ref="fileInput"
            @change="handleImport"
            style="display: none"
            accept=".artsc,.json,.fountain"
          />
          <button class="open-file-btn" @click="$refs.fileInput.click()">
            <i class="pi pi-folder-open"></i> Open From File
          </button>
        </div>

        <div class="launch-menu-section">
          <h2>Recent Projects</h2>
          <div class="recent-projects-list">
            <div
              v-for="proj in recentProjects"
              :key="proj.id"
              class="recent-project-item"
              @click="openRecent(proj.id)"
            >
              {{ proj.name }} ({{ proj.format }})
            </div>

            <p v-if="recentProjects.length === 0" class="no-recent-projects">
              No recent projects found
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'

const router = useRouter()
const store = useProjectStore()
const recentProjects = ref([])
const fileInput = ref(null)

const fullText = 'ArtScript Web'
const displayedText = ref('')
const isTyping = ref(true)
const titleVisible = ref(false)
const titleSlid = ref(false)
const containersVisible = ref(false)
const showCredit = ref(false)

onMounted(() => {
  recentProjects.value = store.loadRecentProjects()
  // Show title first
  setTimeout(() => {
    titleVisible.value = true
    startTypingAnimation()
  }, 100)
})

const startTypingAnimation = () => {
  let index = 0
  const typingInterval = setInterval(() => {
    if (index < fullText.length) {
      displayedText.value = fullText.substring(0, index + 1)
      index++
    } else {
      clearInterval(typingInterval)
      // Wait a bit before starting the slide animation
      setTimeout(() => {
        isTyping.value = false
        // Wait for cursor to fade, then slide title to left
        setTimeout(() => {
          titleSlid.value = true
          // After title slides, reveal containers first
          setTimeout(() => {
            containersVisible.value = true
            // Last, reveal credit text
            setTimeout(() => {
              showCredit.value = true
            }, 600)
          }, 1200)
        }, 400)
      }, 800)
    }
  }, 100) // Typing speed: 100ms per character
}

const start = (format) => {
  const id = store.createProject(format)
  store.saveToRecentProjects(id)
  router.push(`/project/${id}`)
}

const openRecent = (id) => {
  // In a real app with backend, we would fetch the project data.
  // Since this is memory-based, we check if it's already in the store.
  const exists = store.projects.find((p) => p.id === id)
  if (exists) {
    store.activeProjectId = id
    router.push(`/project/${id}`)
  } else {
    alert(
      "Project data not in memory (Persistence requires Backend/File API). Please use 'Open From File'.",
    )
  }
}

const handleImport = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const text = await file.text()
  const fileName = file.name.toLowerCase()
  
  let id
  if (fileName.endsWith('.fountain')) {
    id = store.importProjectFromFountain(text, file.name)
  } else {
    id = store.importProjectFromJSON(text, file.name)
  }
  
  if (id) {
    store.saveToRecentProjects(id)
    router.push(`/project/${id}`)
  }
}
</script>
