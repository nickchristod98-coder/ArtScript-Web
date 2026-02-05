<template>
  <div class="profile-overlay" v-if="visible">
    <div class="profile-card">
      <h2 class="profile-title">Complete Your Profile</h2>
      <p class="profile-subtitle">What is your role?</p>
      <div class="role-options">
        <button class="role-option" @click="select('writer')">
          <i class="pi pi-pencil"></i>
          <span class="role-name">Writer</span>
          <span class="role-hint">Full editor access. Create and edit scripts.</span>
        </button>
        <button class="role-option" @click="select('actor')">
          <i class="pi pi-book"></i>
          <span class="role-name">Actor</span>
          <span class="role-hint">Read-only with AI Rehearsal tools.</span>
        </button>
        <button class="role-option" @click="select('director')">
          <i class="pi pi-video"></i>
          <span class="role-name">Director</span>
          <span class="role-hint">Read-only with Drawing tools.</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['complete'])

const userStore = useUserStore()

const select = (role) => {
  userStore.completeProfile(role)
  emit('complete')
}
</script>

<style scoped>
.profile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
}

.profile-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.profile-title {
  margin: 0 0 4px 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.profile-subtitle {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #666;
}

.role-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.role-option:hover {
  border-color: #1976d2;
  background: #f5f9ff;
}

.role-option i {
  font-size: 20px;
  color: #555;
  margin-bottom: 4px;
}

.role-name {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

.role-hint {
  font-size: 13px;
  color: #666;
}

:global(body.dark-mode) .profile-card {
  background: #2a2a2a;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

:global(body.dark-mode) .profile-title {
  color: #e0e0e0;
}

:global(body.dark-mode) .profile-subtitle {
  color: #aaa;
}

:global(body.dark-mode) .role-option {
  border-color: #444;
  background: #333;
}

:global(body.dark-mode) .role-option:hover {
  border-color: #64b5f6;
  background: #1e3a5f;
}

:global(body.dark-mode) .role-name {
  color: #e0e0e0;
}

:global(body.dark-mode) .role-hint {
  color: #aaa;
}
</style>
