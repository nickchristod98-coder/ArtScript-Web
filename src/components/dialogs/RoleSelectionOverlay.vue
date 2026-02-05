<template>
  <div class="role-selection-overlay" v-if="visible">
    <div class="role-selection-card">
      <h2 class="role-selection-title">Who are you today?</h2>
      <p class="role-selection-subtitle">Choose how you want to work</p>
      <div class="role-buttons">
        <button class="role-btn" @click="selectRole('writer')">
          <i class="pi pi-pencil"></i>
          <span class="role-label">I'm Writing</span>
          <span class="role-desc">Full access. Edit and write the script.</span>
        </button>
        <button class="role-btn" @click="selectRole('actor')">
          <i class="pi pi-book"></i>
          <span class="role-label">I'm Reading/Rehearsing</span>
          <span class="role-desc">Read-only + AI Rehearsal. View script, add notes, highlight text.</span>
        </button>
        <button class="role-btn" @click="selectRole('director')">
          <i class="pi pi-video"></i>
          <span class="role-label">I'm Directing</span>
          <span class="role-desc">Read-only + Drawing tools. Annotate and sketch on the script.</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const selectRole = (role) => {
  emit('select', role)
}
</script>

<style scoped>
.role-selection-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
}

.role-selection-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.role-selection-title {
  margin: 0 0 4px 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.role-selection-subtitle {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #666;
}

.role-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-btn {
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

.role-btn:hover {
  border-color: #888;
  background: #f8f8f8;
}

.role-btn i {
  font-size: 20px;
  color: #555;
  margin-bottom: 4px;
}

.role-label {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

.role-desc {
  font-size: 13px;
  color: #666;
}

:global(body.dark-mode) .role-selection-card {
  background: #2a2a2a;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

:global(body.dark-mode) .role-selection-title {
  color: #e0e0e0;
}

:global(body.dark-mode) .role-selection-subtitle {
  color: #aaa;
}

:global(body.dark-mode) .role-btn {
  border-color: #444;
  background: #333;
}

:global(body.dark-mode) .role-btn:hover {
  border-color: #666;
  background: #3a3a3a;
}

:global(body.dark-mode) .role-label {
  color: #e0e0e0;
}

:global(body.dark-mode) .role-desc {
  color: #aaa;
}
</style>
