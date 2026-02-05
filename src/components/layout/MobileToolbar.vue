<template>
  <div class="mobile-toolbar">
    <div class="mobile-toolbar-scroll">
      <button class="mobile-toolbar-btn" @click="format('scene-heading')" title="Scene heading (INT./EXT.)">
        INT./EXT.
      </button>
      <button class="mobile-toolbar-btn mobile-toolbar-btn-icon" @click="forceCharacter" title="Force Character">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
      <button class="mobile-toolbar-btn" @click="format('character')" title="Character name">
        CHARACTER
      </button>
      <button class="mobile-toolbar-btn" @click="format('dialogue')" title="Dialogue">
        DIALOGUE
      </button>
      <button class="mobile-toolbar-btn" @click="format('action')" title="Action">
        ACTION
      </button>
      <button class="mobile-toolbar-btn" @click="format('parenthetical')" title="Parenthetical">
        PARENTHETICAL
      </button>
    </div>
  </div>
</template>

<script setup>
const format = (type) => {
  window.dispatchEvent(new CustomEvent('force-line-type', { detail: { type } }))
}

const forceCharacter = () => {
  window.dispatchEvent(new CustomEvent('force-line-type', { detail: { type: 'character', restoreFocus: true } }))
}
</script>


<style scoped>
.mobile-toolbar {
  display: none;
}

@media (max-width: 768px) {
  .mobile-toolbar {
    display: flex;
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 8px 16px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    background: rgba(30, 30, 35, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.25);
    z-index: 100;
  }

  :global(body.dark-mode) .mobile-toolbar {
    background: rgba(20, 20, 25, 0.9);
    box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.4);
  }

  .mobile-toolbar-scroll {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 4px 8px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex: 1;
    min-width: 0;
  }

  .mobile-toolbar-scroll::-webkit-scrollbar {
    display: none;
  }

  .mobile-toolbar-btn {
    flex-shrink: 0;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
  }

  .mobile-toolbar-btn:active {
    transform: scale(0.97);
    background: rgba(255, 255, 255, 0.18);
  }

  .mobile-toolbar-btn-icon {
    padding: 10px 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-toolbar-btn-icon svg {
    display: block;
  }
}
</style>
