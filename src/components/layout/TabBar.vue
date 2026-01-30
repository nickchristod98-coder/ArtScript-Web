<template>
  <div class="tab-bar" :class="{ visible: store.projects.length > 1 }">
    <div
      v-for="project in store.projects"
      :key="project.id"
      class="project-tab"
      :class="{ active: project.id === store.activeProjectId }"
      @click="switchProject(project.id)"
    >
      <span class="tab-name">{{ project.name }}</span>
      <button class="tab-close" @click.stop="closeProject(project.id)">×</button>
    </div>
  </div>
</template>

<script setup>
import { useProjectStore } from '@/stores/project'
import { useRouter } from 'vue-router'

const store = useProjectStore()
const router = useRouter()

const switchProject = (id) => {
  store.activeProjectId = id
  router.push(`/project/${id}`)
}

const closeProject = (id) => {
  store.closeProject(id)
  if (!store.activeProjectId) {
    router.push('/')
  }
}
</script>
