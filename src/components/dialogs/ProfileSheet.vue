<template>
  <div class="profile-sheet-overlay" v-if="visible" @click.self="$emit('close')">
    <div class="profile-sheet">
      <button type="button" class="profile-sheet-close" @click="$emit('close')" aria-label="Close">×</button>

      <div class="profile-sheet-layout">
        <!-- Left: photo + name + info -->
        <aside class="profile-left">
          <label class="profile-photo-label">
            <input
              type="file"
              accept="image/*"
              class="profile-photo-input"
              @change="onPhotoChange"
            />
            <div class="profile-photo-frame">
              <img v-if="profilePhoto" :src="profilePhoto" alt="" class="profile-photo-img" />
              <span v-else class="profile-photo-placeholder"><i class="pi pi-user"></i></span>
            </div>
          </label>
          <div class="profile-name-line">
            <span class="profile-name-surname">{{ displayNameSurname }}</span>
            <button
              type="button"
              class="profile-name-edit-pencil"
              aria-label="Edit name"
              @click="openNameSurnameEdit"
            >
              <i class="pi pi-pencil"></i>
            </button>
          </div>
          <p class="profile-email">{{ email }}</p>
          <p class="profile-role">{{ formattedRole }}</p>
          <button type="button" class="profile-logout" @click="onLogout">
            Log out
          </button>
        </aside>

        <!-- Right: projects -->
        <div class="profile-right">
          <p class="profile-projects-label">Projects</p>
          <div class="profile-projects-grid">
            <button
              v-for="proj in projects"
              :key="proj.id"
              class="profile-script-icon"
              @click="openProject(proj)"
            >
              <div class="script-icon-paper">
                <span class="paper-fold"></span>
                <i class="pi pi-file paper-icon"></i>
              </div>
              <span class="script-icon-title">{{ proj.title || 'Untitled' }}</span>
              <span class="script-icon-meta">{{ formatDate(proj.lastModified) }}</span>
            </button>
          </div>
          <p v-if="projects.length === 0" class="profile-no-projects">No projects</p>
        </div>
      </div>

      <!-- Small popup to edit name / surname -->
      <div v-if="showNameSurnameEdit" class="profile-edit-overlay" @click.self="closeNameSurnameEdit">
        <div class="profile-edit-popup">
          <p class="profile-edit-title">Edit name</p>
          <div class="profile-edit-field">
            <label for="profile-edit-name">Name</label>
            <input
              id="profile-edit-name"
              type="text"
              v-model="editName"
              placeholder="First name"
              class="profile-edit-input"
              @keydown.enter="saveNameSurnameEdit"
            />
          </div>
          <div class="profile-edit-field">
            <label for="profile-edit-surname">Surname</label>
            <input
              id="profile-edit-surname"
              type="text"
              v-model="editSurname"
              placeholder="Last name"
              class="profile-edit-input"
              @keydown.enter="saveNameSurnameEdit"
            />
          </div>
          <div class="profile-edit-actions">
            <button type="button" class="profile-edit-cancel" @click="closeNameSurnameEdit">Cancel</button>
            <button type="button" class="profile-edit-save" @click="saveNameSurnameEdit">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  email: { type: String, default: '' },
  role: { type: String, default: '' },
  nickname: { type: String, default: null },
  name: { type: String, default: null },
  surname: { type: String, default: null },
  profilePhoto: { type: String, default: null },
  projects: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'logout', 'open-project', 'update-photo', 'update-nickname', 'update-name', 'update-surname'])

const showNameSurnameEdit = ref(false)
const editName = ref('')
const editSurname = ref('')

const displayNameSurname = computed(() => {
  const n = (props.name || '').trim()
  const s = (props.surname || '').trim()
  if (n && s) return `${n} ${s}`
  if (n) return n
  if (s) return s
  return '—'
})

const formattedRole = computed(() => {
  if (!props.role) return '—'
  return props.role.charAt(0).toUpperCase() + props.role.slice(1)
})

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString()
}

function onPhotoChange(e) {
  const file = e.target.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = reader.result
    if (typeof dataUrl === 'string') emit('update-photo', dataUrl)
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function onLogout() {
  emit('logout')
  emit('close')
}

function openProject(proj) {
  emit('open-project', proj)
  emit('close')
}

function openNameSurnameEdit() {
  editName.value = props.name || ''
  editSurname.value = props.surname || ''
  showNameSurnameEdit.value = true
}

function closeNameSurnameEdit() {
  showNameSurnameEdit.value = false
}

function saveNameSurnameEdit() {
  const n = editName.value?.trim() || null
  const s = editSurname.value?.trim() || null
  if (n !== (props.name || null)) emit('update-name', n || '')
  if (s !== (props.surname || null)) emit('update-surname', s || '')
  closeNameSurnameEdit()
}
</script>

<style scoped>
.profile-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 24px;
}

.profile-sheet {
  background: #fff;
  border-radius: 12px;
  width: 100%;
  max-width: 720px;
  min-height: 400px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  position: relative;
}

.profile-sheet-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 22px;
  line-height: 1;
  color: #999;
  cursor: pointer;
  border-radius: 6px;
}

.profile-sheet-close:hover {
  color: #333;
  background: #f0f0f0;
}

.profile-sheet-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0;
  flex: 1;
  min-height: 0;
}

/* Left column */
.profile-left {
  padding: 32px 24px;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.profile-photo-label {
  cursor: pointer;
  display: block;
  margin-bottom: 16px;
}

.profile-photo-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.profile-photo-frame {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eee;
}

.profile-photo-label:hover .profile-photo-frame {
  background: #eee;
}

.profile-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-photo-placeholder {
  color: #bbb;
  font-size: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.profile-photo-placeholder .pi {
  font-size: 1em;
}

.profile-name-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 4px;
  min-height: 32px;
  position: relative;
  width: 100%;
}

.profile-name-surname {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.profile-name-edit-pencil {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #999;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}

.profile-name-line:hover .profile-name-edit-pencil {
  opacity: 1;
}

.profile-name-edit-pencil:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #333;
}

.profile-email {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #888;
  word-break: break-all;
}

/* Edit name/surname popup */
.profile-edit-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 12px;
}

.profile-edit-popup {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  min-width: 240px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.profile-edit-title {
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.profile-edit-field {
  margin-bottom: 12px;
}

.profile-edit-field label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 4px;
}

.profile-edit-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
}

.profile-edit-input:focus {
  border-color: #1976d2;
}

.profile-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.profile-edit-cancel {
  padding: 6px 12px;
  font-size: 13px;
  color: #666;
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
}

.profile-edit-cancel:hover {
  background: #f5f5f5;
  color: #333;
}

.profile-edit-save {
  padding: 6px 12px;
  font-size: 13px;
  color: #fff;
  background: #1976d2;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.profile-edit-save:hover {
  background: #1565c0;
}

.profile-role {
  margin: 0 0 20px 0;
  font-size: 12px;
  color: #888;
  text-transform: capitalize;
}

.profile-logout {
  margin-top: auto;
  padding: 8px 16px;
  font-size: 13px;
  color: #666;
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
}

.profile-logout:hover {
  color: #333;
  border-color: #999;
}

/* Right column */
.profile-right {
  padding: 28px 28px 32px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.profile-projects-label {
  margin: 0 0 16px 0;
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.profile-projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 20px;
}

.profile-script-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: center;
}

.profile-script-icon:hover .script-icon-paper {
  border-color: #d0cec8;
  background: #f8f7f4;
}

.script-icon-paper {
  width: 56px;
  height: 80px;
  background: #fcfbf9;
  border: 1px solid #e8e6e2;
  border-radius: 1px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.paper-fold {
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 14px 14px 0;
  border-color: transparent #e5e2dc transparent transparent;
  box-shadow: -1px 1px 2px rgba(0, 0, 0, 0.06);
}

.paper-icon {
  font-size: 18px;
  color: #b8b4ac;
  position: relative;
  z-index: 0;
  margin-top: 4px;
  margin-right: 4px;
}

.script-icon-title {
  font-size: 11px;
  font-weight: 500;
  color: #333;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
}

.script-icon-meta {
  font-size: 10px;
  color: #999;
}

.profile-no-projects {
  margin: 0;
  font-size: 13px;
  color: #999;
}

/* Dark */
:global(body.dark-mode) .profile-sheet {
  background: #252525;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

:global(body.dark-mode) .profile-sheet-close {
  color: #888;
}

:global(body.dark-mode) .profile-sheet-close:hover {
  color: #eee;
  background: #333;
}

:global(body.dark-mode) .profile-left {
  border-right-color: #333;
}

:global(body.dark-mode) .profile-photo-frame {
  background: #333;
  border-color: #444;
}

:global(body.dark-mode) .profile-photo-placeholder {
  color: #555;
}

:global(body.dark-mode) .profile-name-surname {
  color: #eee;
}

:global(body.dark-mode) .profile-name-edit-pencil {
  color: #888;
}

:global(body.dark-mode) .profile-name-edit-pencil:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ddd;
}

:global(body.dark-mode) .profile-edit-popup {
  background: #2d2d2d;
}

:global(body.dark-mode) .profile-edit-title {
  color: #eee;
}

:global(body.dark-mode) .profile-edit-field label {
  color: #aaa;
}

:global(body.dark-mode) .profile-edit-input {
  background: #3a3a3a;
  border-color: #444;
  color: #eee;
}

:global(body.dark-mode) .profile-edit-input:focus {
  border-color: #64b5f6;
}

:global(body.dark-mode) .profile-edit-cancel {
  color: #aaa;
  border-color: #555;
}

:global(body.dark-mode) .profile-edit-cancel:hover {
  background: #3a3a3a;
  color: #ddd;
}

:global(body.dark-mode) .profile-edit-save {
  background: #1976d2;
}

:global(body.dark-mode) .profile-edit-save:hover {
  background: #1565c0;
}

:global(body.dark-mode) .profile-email {
  color: #999;
}

:global(body.dark-mode) .profile-role {
  color: #888;
}

:global(body.dark-mode) .profile-logout {
  color: #999;
  border-color: #444;
}

:global(body.dark-mode) .profile-logout:hover {
  color: #eee;
  border-color: #666;
}

:global(body.dark-mode) .profile-projects-label {
  color: #777;
}

:global(body.dark-mode) .script-icon-paper {
  background: #2f2e2c;
  border-color: #3a3937;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:global(body.dark-mode) .paper-fold {
  border-color: transparent #252422 transparent transparent;
  box-shadow: -1px 1px 2px rgba(0, 0, 0, 0.3);
}

:global(body.dark-mode) .paper-icon {
  color: #555;
}

:global(body.dark-mode) .profile-script-icon:hover .script-icon-paper {
  border-color: #555;
  background: #333;
}

:global(body.dark-mode) .script-icon-title {
  color: #ddd;
}

:global(body.dark-mode) .script-icon-meta {
  color: #777;
}

:global(body.dark-mode) .profile-no-projects {
  color: #666;
}
</style>
