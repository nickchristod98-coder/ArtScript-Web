<template>
  <div class="create-profile-overlay" v-if="visible" @click.self="emit('close')">
    <div class="create-profile-glass">
      <div class="create-profile-card">
        <h2 class="create-profile-title">{{ isSignUp ? 'Create account' : 'Sign in' }}</h2>
        <p v-if="promptMessage" class="create-profile-prompt">{{ promptMessage }}</p>
        <p v-else class="create-profile-subtitle">
          {{ isSignUp ? 'Enter your email, password and choose your role.' : 'Enter your email and password.' }}
        </p>
        <form @submit.prevent="submit" class="create-profile-form">
          <div class="form-group">
            <label for="cp-email">Email</label>
            <input
              id="cp-email"
              type="email"
              v-model="email"
              required
              placeholder="you@example.com"
              class="form-input"
              autocomplete="email"
            />
          </div>
          <div class="form-group">
            <label for="cp-password">Password</label>
            <input
              id="cp-password"
              type="password"
              v-model="password"
              :required="isSignUp"
              placeholder="••••••••"
              class="form-input"
              :autocomplete="isSignUp ? 'new-password' : 'current-password'"
            />
          </div>
          <div v-if="isSignUp" class="form-row">
            <div class="form-group">
              <label for="cp-name">Name</label>
              <input
                id="cp-name"
                type="text"
                v-model="name"
                placeholder="First name"
                class="form-input"
                autocomplete="given-name"
              />
            </div>
            <div class="form-group">
              <label for="cp-surname">Surname</label>
              <input
                id="cp-surname"
                type="text"
                v-model="surname"
                placeholder="Last name"
                class="form-input"
                autocomplete="family-name"
              />
            </div>
          </div>
          <div v-if="isSignUp" class="form-group">
            <label for="cp-nickname">Username</label>
            <input
              id="cp-nickname"
              type="text"
              :value="nickname"
              placeholder="lowercase only"
              class="form-input"
              autocomplete="username"
              maxlength="15"
              @input="nickname = ($event.target.value || '').toLowerCase()"
            />
          </div>
          <!-- Role selection: only when signing up -->
          <div v-if="isSignUp" class="form-group role-group">
            <label>Your role</label>
            <div class="role-chips">
              <button
                type="button"
                v-for="r in roles"
                :key="r.id"
                class="role-chip"
                :class="{ active: selectedRole === r.id }"
                @click="selectedRole = r.id"
              >
                <i :class="r.icon"></i>
                <span>{{ r.label }}</span>
              </button>
            </div>
          </div>
          <p v-if="error" class="form-error">{{ error }}</p>
          <div class="form-actions">
            <button type="submit" class="btn-primary" :disabled="loading || (isSignUp && !selectedRole)">
              {{ loading ? 'Please wait...' : isSignUp ? 'Create profile' : 'Sign in' }}
            </button>
            <button type="button" class="btn-link" @click="toggleMode">
              {{ isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up" }}
            </button>
          </div>
        </form>
        <button type="button" class="close-btn" @click="emit('close')" aria-label="Close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { saveUserToDatabase } from '@/services/userDatabase'

const props = defineProps({
  visible: { type: Boolean, default: false },
  /** Optional message when opened from "guest limit" (e.g. "Sign up for free to unlock 4 project slots!") */
  promptMessage: { type: String, default: '' },
})

const emit = defineEmits(['success', 'close'])

const userStore = useUserStore()
const isSignUp = ref(true)
const email = ref('')
const password = ref('')
const name = ref('')
const surname = ref('')
const nickname = ref('')
const selectedRole = ref('writer')
const error = ref('')
const loading = ref(false)

const roles = [
  { id: 'writer', label: 'Writer', icon: 'pi pi-pencil' },
  { id: 'actor', label: 'Actor', icon: 'pi pi-book' },
  { id: 'director', label: 'Director', icon: 'pi pi-video' },
]

const toggleMode = () => {
  isSignUp.value = !isSignUp.value
  error.value = ''
}

const submit = async () => {
  error.value = ''
  if (isSignUp.value && !selectedRole.value) return
  loading.value = true
  try {
    const result = await userStore.login(email.value, password.value, isSignUp.value)
    if (!result.ok) {
      error.value = result.error || 'Sign in failed.'
      return
    }
    if (isSignUp.value) {
      await userStore.completeProfile(selectedRole.value, nickname.value, name.value, surname.value)
      saveUserToDatabase({
        email: email.value,
        role: selectedRole.value,
        signupDate: new Date().toISOString(),
      })
    }
    emit('success')
    emit('close')
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    error.value = ''
    isSignUp.value = true
    selectedRole.value = 'writer'
    name.value = userStore.name || ''
    surname.value = userStore.surname || ''
    nickname.value = (userStore.nickname || '').toLowerCase()
    if (userStore.email) email.value = userStore.email
    else email.value = ''
    password.value = ''
  }
})
</script>

<style scoped>
/* Glassmorphism overlay */
.create-profile-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.create-profile-glass {
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 1px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.create-profile-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 23px;
  padding: 24px 32px;
  max-width: 520px;
  width: 100%;
  position: relative;
}

.create-profile-title {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.create-profile-prompt {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #1976d2;
  font-weight: 500;
}

.create-profile-subtitle {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #555;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.form-row .form-group {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.create-profile-form .form-group {
  margin-bottom: 18px;
}

.create-profile-form label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #444;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  font-size: 15px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.6);
}

.form-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.25);
}

.role-group {
  margin-bottom: 14px;
}

.role-group label {
  margin-bottom: 8px;
}

.role-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.role-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 14px;
  color: #444;
  transition: all 0.2s;
}

.role-chip:hover {
  border-color: #1976d2;
  background: rgba(25, 118, 210, 0.08);
}

.role-chip.active {
  border-color: #1976d2;
  background: rgba(25, 118, 210, 0.15);
  color: #1565c0;
  font-weight: 500;
}

.role-chip i {
  font-size: 16px;
}

.form-error {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #c62828;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.btn-primary {
  padding: 12px 20px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.35);
}

.btn-primary:hover:not(:disabled) {
  background: #1565c0;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-link {
  background: none;
  border: none;
  color: #1976d2;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
}

.btn-link:hover {
  text-decoration: underline;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 50%;
  font-size: 20px;
  line-height: 1;
  color: #666;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

/* Dark mode */
:global(body.dark-mode) .create-profile-overlay {
  background: rgba(0, 0, 0, 0.5);
}

:global(body.dark-mode) .create-profile-glass {
  background: rgba(40, 40, 40, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

:global(body.dark-mode) .create-profile-card {
  background: rgba(45, 45, 45, 0.85);
}

:global(body.dark-mode) .create-profile-title {
  color: #e8e8e8;
}

:global(body.dark-mode) .create-profile-subtitle {
  color: #aaa;
}

:global(body.dark-mode) .create-profile-form label {
  color: #ccc;
}

:global(body.dark-mode) .form-input {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  color: #e8e8e8;
}

:global(body.dark-mode) .form-input:focus {
  border-color: #64b5f6;
  box-shadow: 0 0 0 2px rgba(100, 181, 246, 0.2);
}

:global(body.dark-mode) .role-chip {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: #ccc;
}

:global(body.dark-mode) .role-chip:hover {
  border-color: #64b5f6;
  background: rgba(100, 181, 246, 0.12);
}

:global(body.dark-mode) .role-chip.active {
  border-color: #64b5f6;
  background: rgba(100, 181, 246, 0.2);
  color: #90caf9;
}

:global(body.dark-mode) .close-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #aaa;
}

:global(body.dark-mode) .close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #e8e8e8;
}
</style>
