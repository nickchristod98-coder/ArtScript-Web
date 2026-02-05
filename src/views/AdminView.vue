<template>
  <div class="admin-fullscreen">
    <!-- 403 Forbidden: not logged in or not admin -->
    <div v-if="!isAdmin" class="admin-forbidden">
      <div class="forbidden-card">
        <h1 class="forbidden-title">403 Forbidden</h1>
        <p class="forbidden-message">You do not have permission to access this page.</p>
        <button class="btn-back" @click="goToApp">
          <i class="pi pi-arrow-left"></i>
          Back to app
        </button>
      </div>
    </div>

    <!-- Dashboard: only when logged in as admin -->
    <div v-else class="admin-dashboard">
      <header class="admin-header">
        <h1 class="admin-title">Admin Dashboard</h1>
        <p class="admin-subtitle">Registered users and stats</p>
        <div class="admin-actions">
          <button class="btn-export" @click="exportCsv" :disabled="users.length === 0">
            <i class="pi pi-download"></i>
            Export CSV
          </button>
          <button class="btn-back" @click="goToApp">
            <i class="pi pi-arrow-left"></i>
            Back to app
          </button>
        </div>
      </header>

      <!-- Summary cards -->
      <div class="admin-cards">
        <div class="admin-card">
          <span class="card-value">{{ totalUsers }}</span>
          <span class="card-label">Total Users</span>
        </div>
        <div class="admin-card">
          <span class="card-value">{{ totalProjects }}</span>
          <span class="card-label">Total Projects</span>
        </div>
        <div class="admin-card">
          <span class="card-value">{{ pctWriter }}%</span>
          <span class="card-label">Writer</span>
        </div>
        <div class="admin-card">
          <span class="card-value">{{ pctActor }}%</span>
          <span class="card-label">Actor</span>
        </div>
        <div class="admin-card">
          <span class="card-value">{{ pctDirector }}%</span>
          <span class="card-label">Director</span>
        </div>
      </div>

      <!-- User table -->
      <div class="admin-table-wrap">
        <table v-if="users.length > 0" class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Email</th>
              <th>Role</th>
              <th>Signup date</th>
              <th>Projects</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, i) in users" :key="u.email + (u.signupDate || i)">
              <td class="col-num">{{ i + 1 }}</td>
              <td class="col-email">{{ u.email }}</td>
              <td class="col-role">{{ formatRole(u.role) }}</td>
              <td class="col-date">{{ formatDate(u.signupDate) }}</td>
              <td class="col-projects">{{ u.projectCount ?? 0 }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="admin-empty">No registered users yet.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useProjectStore } from '@/stores/project'
import { getAllUsersForAdmin } from '@/services/userDatabase'
import { ADMIN_EMAIL } from '@/config/admin'

const router = useRouter()
const userStore = useUserStore()
const projectStore = useProjectStore()
const users = ref([])

const isAdmin = computed(
  () => userStore.isLoggedIn && userStore.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
)

const totalUsers = computed(() => users.value.length)

const totalProjects = computed(() =>
  users.value.reduce((sum, u) => sum + (Number(u.projectCount) || 0), 0)
)

const roleCounts = computed(() => {
  const w = users.value.filter((u) => (u.role || '').toLowerCase() === 'writer').length
  const a = users.value.filter((u) => (u.role || '').toLowerCase() === 'actor').length
  const d = users.value.filter((u) => (u.role || '').toLowerCase() === 'director').length
  return { writer: w, actor: a, director: d }
})

const pctWriter = computed(() =>
  totalUsers.value ? Math.round((roleCounts.value.writer / totalUsers.value) * 100) : 0
)
const pctActor = computed(() =>
  totalUsers.value ? Math.round((roleCounts.value.actor / totalUsers.value) * 100) : 0
)
const pctDirector = computed(() =>
  totalUsers.value ? Math.round((roleCounts.value.director / totalUsers.value) * 100) : 0
)

onMounted(() => {
  if (isAdmin.value) {
    users.value = getAllUsersForAdmin()
  }
})

function formatRole(role) {
  if (!role) return '—'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function exportCsv() {
  if (users.value.length === 0) return
  const headers = ['Email', 'Role', 'Signup date', 'Number of Projects']
  const rows = users.value.map((u) => [
    u.email,
    formatRole(u.role),
    u.signupDate ? new Date(u.signupDate).toLocaleString() : '',
    String(u.projectCount ?? 0),
  ])
  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `artscript-users-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function goToApp() {
  const id = projectStore.activeProjectId
  if (id) {
    router.push({ name: 'workspace', params: { id } })
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.admin-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow: auto;
}

/* 403 Forbidden */
.admin-forbidden {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  padding: 24px;
}

.forbidden-card {
  text-align: center;
  padding: 48px;
  max-width: 400px;
}

.forbidden-title {
  margin: 0 0 16px 0;
  font-size: 32px;
  font-weight: 700;
  color: #e53935;
}

.forbidden-message {
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #b0b0b0;
}

/* Dashboard */
.admin-dashboard {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24px;
}

.admin-header {
  max-width: 1000px;
  margin: 0 auto 24px;
}

.admin-title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.admin-subtitle {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #666;
}

.admin-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-export,
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  transition: background 0.2s, opacity 0.2s;
}

.btn-export {
  background: #1976d2;
  color: white;
}

.btn-export:hover:not(:disabled) {
  background: #1565c0;
}

.btn-export:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-back {
  background: #e0e0e0;
  color: #333;
}

.btn-back:hover {
  background: #d0d0d0;
}

.admin-forbidden .btn-back {
  margin-top: 8px;
  background: #333;
  color: #e0e0e0;
}

.admin-forbidden .btn-back:hover {
  background: #444;
}

/* Summary cards */
.admin-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  max-width: 1000px;
  margin: 0 auto 24px;
}

.admin-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.card-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #1976d2;
  line-height: 1.2;
}

.card-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.admin-table-wrap {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th,
.admin-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.admin-table th {
  background: #fafafa;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.admin-table tbody tr:hover {
  background: #f9f9f9;
}

.col-num {
  width: 48px;
  color: #999;
  font-size: 13px;
}

.col-email {
  font-weight: 500;
  color: #1a1a1a;
}

.col-role {
  text-transform: capitalize;
  color: #555;
}

.col-date {
  font-size: 13px;
  color: #666;
}

.col-projects {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.admin-empty {
  padding: 48px 24px;
  text-align: center;
  color: #888;
  font-size: 15px;
}

:global(body.dark-mode) .admin-dashboard {
  background: #1a1a1a;
}

:global(body.dark-mode) .admin-title {
  color: #e8e8e8;
}

:global(body.dark-mode) .admin-subtitle {
  color: #aaa;
}

:global(body.dark-mode) .admin-card {
  background: #2a2a2a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:global(body.dark-mode) .card-value {
  color: #64b5f6;
}

:global(body.dark-mode) .card-label {
  color: #aaa;
}

:global(body.dark-mode) .admin-table-wrap {
  background: #2a2a2a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:global(body.dark-mode) .admin-table th {
  background: #333;
  color: #aaa;
}

:global(body.dark-mode) .admin-table td {
  border-bottom-color: #444;
}

:global(body.dark-mode) .admin-table tbody tr:hover {
  background: #333;
}

:global(body.dark-mode) .col-email {
  color: #e8e8e8;
}

:global(body.dark-mode) .col-role,
:global(body.dark-mode) .col-date,
:global(body.dark-mode) .col-projects {
  color: #bbb;
}

:global(body.dark-mode) .btn-back {
  background: #444;
  color: #e0e0e0;
}

:global(body.dark-mode) .btn-back:hover {
  background: #555;
}
</style>
