// src/composables/useAutoSave.js
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useUserStore } from '@/stores/user'

export function useAutoSave(intervalMs = 30000) {
  const store = useProjectStore()
  const userStore = useUserStore()
  const lastSaved = ref(null)
  const isSaving = ref(false)
  const autoSaveEnabled = ref(true)
  let saveInterval = null

  const saveToStorage = async () => {
    if (!store.activeProject || !autoSaveEnabled.value) return

    isSaving.value = true

    try {
      // Save to IndexedDB
      const db = await openDatabase()
      const tx = db.transaction('projects', 'readwrite')
      const projectStore = tx.objectStore('projects')

      await projectStore.put({
        id: store.activeProject.id,
        data: JSON.stringify(store.activeProject),
        timestamp: Date.now(),
      })

      // Persist to artscript_user_data when user is logged in and this project is in My Workspace
      if (userStore.isLoggedIn && userStore.getProject(store.activeProject.id)) {
        const data = store.getProjectDataAsObject()
        if (data) {
          userStore.updateProject(store.activeProject.id, {
            title: store.activeProject.name,
            lastModified: Date.now(),
            content: JSON.stringify(data),
          })
        }
      }

      lastSaved.value = new Date()
      console.log('Auto-saved at', lastSaved.value.toLocaleTimeString())
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      isSaving.value = false
    }
  }

  const openDatabase = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ArtScriptDB', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' })
        }
      }
    })
  }

  const loadFromStorage = async (projectId) => {
    try {
      const db = await openDatabase()
      const tx = db.transaction('projects', 'readonly')
      const projectStore = tx.objectStore('projects')
      const request = projectStore.get(projectId)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          if (request.result) {
            resolve(JSON.parse(request.result.data))
          } else {
            resolve(null)
          }
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Load from storage failed:', error)
      return null
    }
  }

  const startAutoSave = () => {
    if (saveInterval) return

    saveInterval = setInterval(() => {
      saveToStorage()
    }, intervalMs)
  }

  const stopAutoSave = () => {
    if (saveInterval) {
      clearInterval(saveInterval)
      saveInterval = null
    }
  }

  // Watch for changes and debounce save
  let saveTimeout = null
  watch(
    () => store.activeProject?.lines,
    () => {
      if (saveTimeout) clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        saveToStorage()
      }, 2000) // Save 2 seconds after last change
    },
    { deep: true },
  )

  onMounted(() => {
    startAutoSave()
  })

  onUnmounted(() => {
    stopAutoSave()
  })

  return {
    lastSaved,
    isSaving,
    autoSaveEnabled,
    saveToStorage,
    loadFromStorage,
    startAutoSave,
    stopAutoSave,
  }
}
