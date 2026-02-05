import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'
import './assets/styles.css'
import './assets/mobile.css'

import App from './App.vue'
import router from './router'
import { isFirebaseConfigured, subscribeToAuth } from '@/services/firebase'
import { useUserStore } from '@/stores/user'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// When Firebase is configured: sync store with auth state (persisted session + logout cleanup)
if (isFirebaseConfigured()) {
  subscribeToAuth((firebaseUser) => {
    const userStore = useUserStore(pinia)
    if (firebaseUser) {
      userStore.syncFromFirebase(firebaseUser.uid, firebaseUser.email || '')
    } else {
      userStore.clearForLogout()
    }
  })
}

app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.dark-mode'
        }
    }
})

app.mount('#app')