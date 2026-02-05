<template>
  <div
    class="launch-menu-overlay"
    :class="{ 'title-slid': titleSlid }"
    :style="{ '--scale': scale }"
  >
    <!-- Profile button: top-right (hidden when FEATURES_PROFILE_UI_HIDDEN) -->
    <div v-if="!profileUiHidden" class="home-profile-bar">
      <button
        v-if="!userStore.isLoggedIn"
        class="home-profile-btn home-profile-create"
        @click="openCreateProfileModal()"
        title="Create a free profile to unlock 4 project slots"
      >
        <i class="pi pi-user-plus"></i>
        <span>Create Profile</span>
      </button>
      <button
        v-else
        class="home-profile-btn home-profile-my"
        @click="showProfileSheet = true"
        :title="userStore.email || 'My profile'"
      >
        <i class="pi pi-user"></i>
        <span class="home-profile-label">{{ displayProfileLabel }}</span>
      </button>
    </div>

    <!-- Title: center initially; on desktop slides left, on mobile slides to top -->
    <div
      class="title-clip-wrapper"
      :class="{ 'title-slid': titleSlid }"
    >
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
    </div>

    <!-- Options container: desktop = two columns; mobile = single column with title inside -->
    <div class="launch-menu-container" :class="{ 'visible': containersVisible }">
      <!-- Mobile-only title: inside container, at top -->
      <div class="mobile-title-in-container" :class="{ 'title-visible': titleVisible }">
        <h1 class="launch-menu-title mobile-title">
          <span class="typed-text">{{ displayedText }}</span>
          <span class="cursor-marker"></span>
        </h1>
        <p class="title-credit" :class="{ 'visible': showCredit }">
          Created by Nick Christod
        </p>
      </div>
      <!-- Left Container: desktop only, overflow hidden when title slides in -->
      <div class="launch-menu-left" :class="{ 'clip-title': titleSlid }">
      </div>

      <!-- Right Container: Actions (desktop) / Full content (mobile) -->
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
            :accept="isMobile ? 'application/json,text/plain,.asxpro,.fountain,.fnt' : '.asxpro,.fountain'"
          />
          <button class="open-file-btn" @click="$refs.fileInput.click()">
            <i class="pi pi-folder-open"></i> Open From File
          </button>
        </div>

        <div class="launch-menu-section recent-projects-section">
          <h2>Recent Projects</h2>
          <div class="recent-projects-list">
            <div
              v-for="(proj, idx) in recentProjects"
              :key="proj.date || idx"
              class="recent-project-item"
              @click="openRecent(proj)"
            >
              {{ proj.name }}
            </div>

            <p v-if="recentProjects.length === 0" class="no-recent-projects">
              No recent projects found
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals (only when profile UI is enabled) -->
    <template v-if="!profileUiHidden">
      <CreateProfileModal
        :visible="createProfileModalVisible"
        :prompt-message="createProfilePromptMessage"
        @success="createProfileModalVisible = false"
        @close="createProfileModalVisible = false"
      />
      <ProfileSheet
        :visible="showProfileSheet"
        :email="userStore.email || ''"
        :role="userStore.role || ''"
        :nickname="userStore.nickname"
        :name="userStore.name"
        :surname="userStore.surname"
        :profile-photo="userStore.profilePhoto"
        :projects="profileSheetProjects"
        @close="showProfileSheet = false"
        @logout="onProfileLogout"
        @open-project="onProfileOpenProject"
        @update-photo="userStore.setProfilePhoto"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useUserStore } from '@/stores/user'
import { FEATURES_PROFILE_UI_HIDDEN } from '@/config/features'
import CreateProfileModal from '@/components/dialogs/CreateProfileModal.vue'
import ProfileSheet from '@/components/dialogs/ProfileSheet.vue'

const profileUiHidden = FEATURES_PROFILE_UI_HIDDEN
const router = useRouter()
const store = useProjectStore()
const userStore = useUserStore()
const recentProjects = ref([])
const fileInput = ref(null)
const createProfileModalVisible = ref(false)
const createProfilePromptMessage = ref('')
const showProfileSheet = ref(false)

const displayProfileLabel = computed(() => {
  const nick = userStore.nickname?.trim()
  if (nick) {
    const lower = nick.toLowerCase()
    return lower.length > 15 ? lower.slice(0, 15) + '…' : lower
  }
  const e = userStore.email
  if (!e) return 'My profile'
  return e.length > 15 ? e.slice(0, 12) + '…' : e
})

const profileSheetProjects = computed(() =>
  (userStore.projects || []).map((p) => ({
    id: p.id,
    title: p.title || 'Untitled',
    lastModified: p.lastModified,
    content: p.content,
  }))
)

function openCreateProfileModal(promptMessage = '') {
  createProfilePromptMessage.value = promptMessage
  createProfileModalVisible.value = true
}

function onProfileLogout() {
  userStore.logout()
  showProfileSheet.value = false
}

function onProfileOpenProject(proj) {
  if (!proj?.content) return
  const id = store.importProjectFromJSON(proj.content, proj.title || 'Untitled')
  if (id) {
    store.saveToRecentProjects(id)
    router.push(`/project/${id}`)
  }
  showProfileSheet.value = false
}

const fullText = 'ArtScript Web'
const displayedText = ref('')
const isTyping = ref(true)
const titleVisible = ref(false)
const titleSlid = ref(false)
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth <= 1024)
const containersVisible = ref(false)
const showCredit = ref(false)

// Unified scaling: base design is 1440x900, scale proportionally
const BASE_WIDTH = 1440
const BASE_HEIGHT = 900
const scale = ref(1)

const updateScale = () => {
  const scaleX = window.innerWidth / BASE_WIDTH
  const scaleY = window.innerHeight / BASE_HEIGHT
  scale.value = Math.min(scaleX, scaleY, 1.2)
}

const handleResize = () => {
  updateScale()
  const mobile = window.innerWidth <= 1024
  isMobile.value = mobile
  if (mobile) containersVisible.value = true
}

onMounted(() => {
  recentProjects.value = store.loadRecentProjects()
  isMobile.value = window.innerWidth <= 1024
  if (isMobile.value) containersVisible.value = true

  updateScale()
  window.addEventListener('resize', handleResize)

  setTimeout(() => {
    titleVisible.value = true
    startTypingAnimation()
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
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
          // Reveal containers when slide starts
          containersVisible.value = true
          titleSlid.value = true
          // After title slides, reveal credit text
          setTimeout(() => {
            showCredit.value = true
          }, 600)
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

const openRecent = (entry) => {
  const id = store.loadRecentProject(entry)
  if (id) {
    store.saveToRecentProjects(id)
    router.push(`/project/${id}`)
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

<style scoped>
/* Profile bar: fixed top-right */
.home-profile-bar {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1100;
  padding: 16px 24px;
  pointer-events: auto;
}

.home-profile-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s, background 0.2s, border-color 0.2s;
}

.home-profile-create {
  color: #fff;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.4);
}

.home-profile-create:hover {
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.5);
  transform: translateY(-1px);
}

.home-profile-my {
  color: #1976d2;
  background: rgba(25, 118, 210, 0.1);
  border: 1px solid rgba(25, 118, 210, 0.3);
}

.home-profile-my:hover {
  background: rgba(25, 118, 210, 0.15);
  border-color: rgba(25, 118, 210, 0.5);
}

.home-profile-btn .pi {
  font-size: 16px;
}

.home-profile-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 12em;
}

/* Unified scaling using CSS custom property */
:deep(.launch-menu-overlay) {
  --scale: 1;
}

/* Left container: overflow hidden when title slides in to keep it bounded */
:deep(.launch-menu-left) {
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: calc(60px * var(--scale));
  padding-left: calc(2rem * var(--scale));
  position: relative;
}

:deep(.launch-menu-left.clip-title) {
  overflow: hidden;
}

/* Clip wrapper: full viewport when centered; left half (50vw) when slid to trap title */
:deep(.title-clip-wrapper) {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  overflow: visible;
  transform: translateZ(0);
  z-index: 100;
  pointer-events: none;
  transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.title-clip-wrapper.title-slid) {
  width: 50vw;
  overflow: hidden;
}

/* Title: positioned inside clip wrapper; centered initially, left when slid */
:deep(.title-wrapper) {
  position: fixed;
  display: flex;
  flex-direction: column;
  opacity: 0;
  transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.title-wrapper.title-visible) {
  opacity: 1;
}

:deep(.title-wrapper) {
  pointer-events: auto;
}

/* Centered: middle of viewport, text centered */
:deep(.title-wrapper.title-centered) {
  top: 50%;
  left: 50%;
  align-items: center;
  transform: translate(-50%, -50%) scale(var(--scale));
}

:deep(.title-wrapper.title-centered .launch-menu-title) {
  text-align: center;
}

/* Slid: aligns with left container, text left; clip wrapper traps it */
:deep(.title-wrapper.title-left) {
  top: 50%;
  align-items: flex-start;
  /* Match left container: centered 90%/1200px, left half + padding */
  left: calc((100vw - min(90vw, 1200px)) / 2 + 2rem * var(--scale));
  transform: translateY(-50%) scale(var(--scale));
  transform-origin: left center;
}

:deep(.title-wrapper.title-left .launch-menu-title) {
  text-align: left;
}

/* Scale the title text */
:deep(.launch-menu-title) {
  font-size: calc(64px * var(--scale));
}

:deep(.title-credit) {
  font-size: calc(14px * var(--scale));
  margin-top: calc(12px * var(--scale));
}

/* Scale the container content */
:deep(.launch-menu-container) {
  --scale: inherit;
}

:deep(.launch-menu-right) {
  padding: calc(60px * var(--scale));
}

:deep(.launch-menu-section) {
  margin-bottom: calc(40px * var(--scale));
}

:deep(.launch-menu-section h2) {
  font-size: calc(16px * var(--scale));
  margin-bottom: calc(20px * var(--scale));
}

:deep(.launch-menu-formats) {
  gap: calc(20px * var(--scale));
}

:deep(.launch-format-btn) {
  padding: calc(20px * var(--scale)) calc(16px * var(--scale));
  gap: calc(8px * var(--scale));
  border-radius: calc(4px * var(--scale));
}

:deep(.format-icon) {
  font-size: calc(20px * var(--scale));
}

:deep(.format-name) {
  font-size: calc(18px * var(--scale));
}

:deep(.coming-soon) {
  font-size: calc(11px * var(--scale));
}

:deep(.open-file-btn) {
  padding: calc(14px * var(--scale)) calc(20px * var(--scale));
  font-size: calc(14px * var(--scale));
  gap: calc(8px * var(--scale));
  border-radius: calc(4px * var(--scale));
}

:deep(.recent-project-item) {
  padding: calc(14px * var(--scale)) calc(16px * var(--scale));
  margin-bottom: calc(8px * var(--scale));
  font-size: calc(14px * var(--scale));
  border-radius: calc(4px * var(--scale));
}

:deep(.no-recent-projects) {
  font-size: calc(14px * var(--scale));
  padding: calc(20px * var(--scale));
}

:deep(.recent-projects-list) {
  max-height: calc(180px * var(--scale));
}

/* Mobile title in container: hidden on desktop */
:deep(.mobile-title-in-container) {
  display: none;
}

/* Mobile + Tablet: single-column layout, title inside container */
@media (max-width: 1024px) {
  :deep(.launch-menu-overlay) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  :deep(.title-clip-wrapper) {
    display: none !important;
  }

  :deep(.mobile-title-in-container) {
    display: flex !important;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
    padding: 28px 0 24px;
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  :deep(.mobile-title-in-container.title-visible) {
    opacity: 1;
  }

  :deep(.mobile-title-in-container .launch-menu-title) {
    text-align: center !important;
    white-space: nowrap;
    font-size: 52px !important; /* tablet; phone overrides to 44px */
  }

  :deep(.mobile-title-in-container .cursor-marker) {
    height: 30px !important;
    width: 2px !important;
  }

  :deep(.mobile-title-in-container .title-credit) {
    text-align: center !important;
    font-size: 11px !important;
    align-self: center;
    margin-left: auto;
    margin-right: auto;
  }

  :deep(.launch-menu-container) {
    flex-direction: column !important;
    width: 100% !important;
    max-width: none !important; /* tablet full-width; phone overrides to 420px below */
    align-items: center !important;
  }

  :deep(.launch-menu-left) {
    display: none !important;
  }

  :deep(.launch-menu-right) {
    width: 100% !important;
    padding: 24px 24px 32px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  :deep(.recent-projects-section) {
    display: none !important;
  }

  :deep(.launch-menu-section) {
    margin-bottom: 14px !important;
    width: 100%;
  }

  :deep(.launch-menu-section h2) {
    font-size: 16px !important;
    margin-bottom: 14px !important;
    text-align: center !important;
  }

  :deep(.launch-menu-formats) {
    flex-direction: column !important;
    gap: 12px !important;
  }

  :deep(.launch-format-btn) {
    padding: 10px 14px !important;
    min-height: 34px !important;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
    border-radius: 10px !important;
  }

  :deep(.format-icon) {
    font-size: 22px !important;
  }

  :deep(.format-name) {
    font-size: 20px !important;
  }

  :deep(.coming-soon) {
    font-size: 13px !important;
  }

  :deep(.open-file-btn) {
    padding: 10px 14px !important;
    min-height: 34px !important;
    font-size: 20px !important;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
    border-radius: 10px !important;
    margin-top: 16px !important;
  }

  :deep(.open-file-btn .pi) {
    font-size: 22px !important;
  }

  /* Phone-only: narrow centered container, larger touch targets and title */
  @media (max-width: 768px) {
    :deep(.launch-menu-container) {
      max-width: 420px !important;
    }

    :deep(.mobile-title-in-container .launch-menu-title) {
      font-size: 44px !important;
    }

    :deep(.mobile-title-in-container .cursor-marker) {
      height: 34px !important;
    }

    :deep(.mobile-title-in-container .title-credit) {
      font-size: 12px !important;
    }

    :deep(.launch-menu-section h2) {
      font-size: 17px !important;
    }

    :deep(.launch-format-btn) {
      padding: 12px 14px !important;
      min-height: 37px !important;
    }

    :deep(.format-icon) {
      font-size: 25px !important;
    }

    :deep(.format-name) {
      font-size: 23px !important;
    }

    :deep(.coming-soon) {
      font-size: 14px !important;
    }

    :deep(.open-file-btn) {
      padding: 12px 14px !important;
      min-height: 37px !important;
      font-size: 23px !important;
      margin-top: 18px !important;
    }

    :deep(.open-file-btn .pi) {
      font-size: 25px !important;
    }
  }

  @media (max-width: 380px) {
    :deep(.mobile-title-in-container .launch-menu-title) {
      font-size: 35px !important;
    }
  }
}

:global(body.dark-mode) .home-profile-create {
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.5);
}

:global(body.dark-mode) .home-profile-my {
  color: #64b5f6;
  background: rgba(100, 181, 246, 0.12);
  border-color: rgba(100, 181, 246, 0.35);
}

:global(body.dark-mode) .home-profile-my:hover {
  background: rgba(100, 181, 246, 0.2);
  border-color: rgba(100, 181, 246, 0.5);
}
</style>
