<template>
  <aside v-if="store.episodeNavVisible" class="sidebar episode-navigator">
    <div class="sidebar-header">
      <h3>Seasons</h3>
      <button class="add-season-btn" data-training="add-season-btn" title="Add Season" @click="store.addNewSeason">
        <i class="pi pi-plus"></i>
      </button>
    </div>
    <div class="season-list">
      <div
        v-for="(season, seasonIdx) in store.activeSeasons"
        :key="seasonIdx"
        class="season-container"
      >
        <div
          class="season-header"
          @click="toggleSeason(seasonIdx)"
        >
          <i class="pi pi-chevron-right season-chevron" :class="{ 'expanded': expandedSeasons.has(seasonIdx) }"></i>
          <span class="season-title">Season {{ season.seasonNumber }}</span>
          <button
            class="add-episode-btn"
            data-training="add-episode-btn"
            title="Add Episode"
            @click.stop="store.addEpisode(seasonIdx)"
          >
            <i class="pi pi-plus"></i>
          </button>
        </div>
        <div
          v-if="expandedSeasons.has(seasonIdx)"
          class="episode-list"
        >
          <div
            v-for="(ep, epIdx) in season.episodes"
            :key="ep.id"
            class="episode-item"
            :class="getHighlightClass(ep, seasonIdx, epIdx)"
            @click="store.switchEpisode(ep.id, seasonIdx)"
          >
            <span class="episode-number">S{{ String(season.seasonNumber).padStart(2, '0') }}E{{ String(epIdx + 1).padStart(2, '0') }}</span>
            <span class="episode-title">{{ ep.name }}</span>
          </div>
          <p v-if="season.episodes.length === 0" class="empty-episodes">No episodes yet</p>
        </div>
      </div>
      <p v-if="store.activeSeasons.length === 0" class="empty-seasons">No seasons yet</p>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project'

const store = useProjectStore()

// Check if TV Show format
const isTVShow = computed(() => store.activeProject?.format === 'TV Show')

// Track expanded seasons
const expandedSeasons = ref(new Set([0])) // Default: Season 1 expanded

// Toggle season expansion
const toggleSeason = (seasonIdx) => {
  if (expandedSeasons.value.has(seasonIdx)) {
    expandedSeasons.value.delete(seasonIdx)
  } else {
    expandedSeasons.value.add(seasonIdx)
  }
}

// Auto-expand season when switching to an episode in it or when a new season is created
watch(
  () => [store.activeProject?.activeSeasonIndex, store.activeSeasons.length],
  ([newIndex, seasonCount]) => {
    if (newIndex !== null && newIndex !== undefined) {
      expandedSeasons.value.add(newIndex)
    }
    // Auto-expand newly created seasons
    if (seasonCount > 0) {
      expandedSeasons.value.add(seasonCount - 1)
    }
  },
  { immediate: true }
)

// Determine which episode should be highlighted (active episode)
const getHighlightClass = (ep, seasonIdx, epIdx) => {
  const isActive = ep.id === store.activeProject?.activeEpisodeId &&
                   store.activeProject?.activeSeasonIndex === seasonIdx
  const season = store.activeSeasons[seasonIdx]
  const isLastEpisode = season && epIdx === season.episodes.length - 1 &&
                         store.activeProject?.activeSeasonIndex === seasonIdx
  
  // Highlight active episode, or last episode in active season if nothing is active
  return (isActive || (!store.activeProject?.activeEpisodeId && isLastEpisode)) ? 'last-episode' : ''
}
</script>

<style scoped>

.sidebar {
  width: 280px;
  background-color: #f8f8f8;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
}
.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}
.sidebar-header h3 {
  font-size: 18px;
  font-weight: 300;
  color: #333;
  margin: 0;
  transition: color 0.3s ease;
  flex: 1;
}
.add-season-btn,
.add-episode-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}
.add-season-btn:hover,
.add-episode-btn:hover {
  background: #f0f0f0;
  color: #333;
}
.season-list {
  overflow-y: auto;
  flex: 1;
  background: transparent;
}
.season-container {
  border-bottom: 1px solid #eee;
}
.season-header {
  padding: 12px 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  user-select: none;
}
.season-header:hover {
  background: #f5f5f5;
}
.season-chevron {
  font-size: 12px;
  color: #666;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}
.season-chevron.expanded {
  transform: rotate(90deg);
}
.season-title {
  flex: 1;
  font-weight: 500;
  color: #333;
  font-size: 0.95rem;
}
.episode-list {
  background: #fafafa;
  padding-left: 0;
}
.episode-item {
  padding: 12px 15px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 44px;
  transition: background-color 0.2s ease;
}
.episode-item:hover {
  background: #f0f0f0;
}
.episode-item.last-episode {
  border-right: 2px solid #999;
  background: #e0e0e0;
}
.episode-item.last-episode:hover {
  background: #f0f0f0;
}
.episode-number {
  color: #666;
  font-weight: 600;
  font-size: 0.9rem;
  min-width: 28px;
  flex-shrink: 0;
  display: inline-block;
}
.episode-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #555;
  font-family: 'Courier New', monospace;
}
.empty-episodes,
.empty-seasons {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 0.85rem;
}
</style>

<style>
/* Dark Mode - Global styles to ensure they work */
body.dark-mode .sidebar.episode-navigator {
  background-color: #252525 !important;
  background: #252525 !important;
  border-left-color: #444;
}

body.dark-mode .sidebar-header {
  border-bottom-color: #444;
  background-color: transparent !important;
}

body.dark-mode .sidebar-header h3 {
  color: #f5f5f5 !important;
  font-weight: 300;
}

body.dark-mode .add-season-btn,
body.dark-mode .add-episode-btn {
  color: #aaa;
}

body.dark-mode .add-season-btn:hover,
body.dark-mode .add-episode-btn:hover {
  background: #2a2a2a;
  color: #f5f5f5;
}

body.dark-mode .season-header {
  border-bottom-color: #333;
}

body.dark-mode .season-header:hover {
  background: #2a2a2a;
}

body.dark-mode .season-title {
  color: #f5f5f5;
}

body.dark-mode .season-chevron {
  color: #aaa;
}

body.dark-mode .episode-list {
  background: #1f1f1f;
}

body.dark-mode .episode-item {
  color: #f5f5f5 !important;
  border-bottom-color: #333;
}

body.dark-mode .episode-item:hover {
  background: #2a2a2a !important;
}

body.dark-mode .episode-item.last-episode {
  border-right-color: #777;
  background: #181818 !important;
}

body.dark-mode .episode-item.last-episode:hover {
  background: #252525 !important;
}

body.dark-mode .episode-number {
  color: #ccc !important;
}

body.dark-mode .episode-title {
  color: #f5f5f5 !important;
}

body.dark-mode .empty-episodes {
  color: #666 !important;
}

</style>
