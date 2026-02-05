import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WorkspaceView from '../views/WorkspaceView.vue'
import AdminView from '../views/AdminView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/project/:id',
      name: 'workspace',
      component: WorkspaceView,
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
    },
  ],
})

// Send Google Analytics page_view on each SPA navigation
router.afterEach((to) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-ZNXGFSKT9Y', {
      page_path: to.fullPath,
      page_title: to.name === 'home' ? 'Home' : to.name === 'workspace' ? 'Editor' : document.title,
    })
  }
})

export default router
