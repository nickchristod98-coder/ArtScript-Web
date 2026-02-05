<template>
  <div class="auth-overlay" v-if="visible">
    <div class="auth-card">
      <h2 class="auth-title">{{ isSignUp ? 'Create account' : 'Sign in' }}</h2>
      <p class="auth-subtitle">
        {{ isSignUp ? 'Enter your email and a password to get started.' : 'Enter your email and password.' }}
      </p>
      <form @submit.prevent="submit" class="auth-form">
        <div class="form-group">
          <label for="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            v-model="email"
            required
            placeholder="you@example.com"
            class="form-input"
            autocomplete="email"
          />
        </div>
        <div class="form-group">
          <label for="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            v-model="password"
            :required="isSignUp"
            placeholder="••••••••"
            class="form-input"
            autocomplete="current-password"
          />
        </div>
        <p v-if="error" class="auth-error">{{ error }}</p>
        <div class="auth-actions">
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Sign in' }}
          </button>
          <button type="button" class="btn-link" @click="toggleMode">
            {{ isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up" }}
          </button>
          <button type="button" class="btn-link btn-skip" @click="$emit('skip')">
            Continue without signing in
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['success'])

const userStore = useUserStore()
const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const toggleMode = () => {
  isSignUp.value = !isSignUp.value
  error.value = ''
}

const submit = () => {
  error.value = ''
  loading.value = true
  const ok = userStore.login(email.value, password.value, isSignUp.value)
  loading.value = false
  if (ok) {
    emit('success')
  } else {
    error.value = 'Please enter a valid email.'
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    error.value = ''
    if (!userStore.email) email.value = ''
    else email.value = userStore.email
    password.value = ''
  }
})
</script>

<style scoped>
.auth-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
}

.auth-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.auth-title {
  margin: 0 0 4px 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.auth-subtitle {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #666;
}

.auth-form .form-group {
  margin-bottom: 16px;
}

.auth-form label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #444;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.auth-error {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #c62828;
}

.auth-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.btn-primary {
  padding: 12px 20px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #1565c0;
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

.btn-skip {
  margin-top: 8px;
  color: #888;
  font-size: 13px;
}

:global(body.dark-mode) .auth-card {
  background: #2a2a2a;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

:global(body.dark-mode) .auth-title {
  color: #e0e0e0;
}

:global(body.dark-mode) .auth-subtitle {
  color: #aaa;
}

:global(body.dark-mode) .auth-form label {
  color: #ccc;
}

:global(body.dark-mode) .form-input {
  background: #333;
  border-color: #555;
  color: #e0e0e0;
}

:global(body.dark-mode) .form-input:focus {
  border-color: #64b5f6;
  box-shadow: 0 0 0 2px rgba(100, 181, 246, 0.2);
}
</style>
