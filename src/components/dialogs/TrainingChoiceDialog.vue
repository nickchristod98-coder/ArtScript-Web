<!-- Training choice: The Manual (summary) or Interactive (step-by-step) -->
<template>
  <Dialog
    v-model:visible="visible"
    header="Training"
    :modal="true"
    :style="{ width: showManual ? '760px' : '380px' }"
    :dismissableMask="true"
    :closable="true"
    class="training-choice-dialog"
    @hide="showManual = false"
  >
    <template v-if="!showManual">
      <p class="training-choice-intro">Choose how you want to learn:</p>
      <div class="training-choice-buttons">
        <button type="button" class="training-choice-option interactive" @click="startInteractive">
          <i class="pi pi-play"></i>
          <span class="option-text">
            <span class="option-label">Interactive</span>
            <span class="option-desc">Step-by-step guided training</span>
          </span>
        </button>
        <button type="button" class="training-choice-option manual" @click="showManual = true">
          <i class="pi pi-book"></i>
          <span class="option-text">
            <span class="option-label">The Manual</span>
            <span class="option-desc">Read a summary of all training steps</span>
          </span>
        </button>
      </div>
    </template>
    <template v-else>
      <div class="training-manual-header">
        <button type="button" class="training-manual-back" @click="showManual = false" title="Back">
          <i class="pi pi-chevron-left"></i> Back
        </button>
        <h3 class="training-manual-title">The Manual — Training Summary</h3>
      </div>
      <div class="training-manual-content">
        <ol class="training-manual-steps">
          <li><strong>Scene heading.</strong> On the first line of your script, type a scene heading: start with <strong>INT.</strong> (interior) or <strong>EXT.</strong> (exterior), then a space, then the location in CAPS (e.g. COFFEE SHOP), then a space, a hyphen, a space, and the time of day in CAPS (e.g. DAY, NIGHT, LATER). Example: <strong>INT. COFFEE SHOP - DAY</strong>. The app detects this pattern and formats the line as a scene heading automatically.</li>
          <li><strong>Action line.</strong> On the next line, write what we see or what happens in the scene in present tense—no dialogue, just description (e.g. John walks to the counter. The barista nods.). This is an “action” line; the app will format it with normal margins.</li>
          <li><strong>Character name.</strong> Start a new line. Press <strong>TAB</strong> once to move the cursor to the center of the page, then type the character’s name in ALL CAPS (e.g. JOHN). Use one line per character. The app will treat the very next line as that character’s dialogue.</li>
          <li><strong>Dialogue.</strong> Directly under the character name, type exactly what that character says out loud. You don’t need quotation marks; the app formats it as dialogue (indented from both sides). Example: One black coffee, please.</li>
          <li v-if="isTV"><strong>Episodes sidebar.</strong> In the top-right area of the workspace, use the button that toggles the <strong>Seasons & Episodes</strong> panel. Click it to show or hide the panel on the right where you manage seasons and episodes for a TV script.</li>
          <li v-if="isTV"><strong>Create an episode.</strong> With the Episodes panel open, find a season (e.g. “Season 1”). Next to that season’s name there is a <strong>+</strong> button. Click the + to add a new episode under that season.</li>
          <li v-if="isTV"><strong>Create a season.</strong> At the top of the Episodes panel, in the <strong>Seasons</strong> header row, click the <strong>+</strong> button to add a new season. You can then add episodes to it using the + next to the season name.</li>
          <li><strong>Dark mode.</strong> In the app header (top of the screen), use the dark/light theme switch to toggle between dark mode and light mode. The whole interface updates immediately.</li>
          <li><strong>Full page view.</strong> In the header, click the eye icon to toggle between <strong>full page view</strong> (editor only, minimal chrome) and standard view (with sidebars and header visible). Use this when you want to focus only on the script.</li>
          <li><strong>Spell & Grammar.</strong> The spell-check button in the header turns under-the-line spell checking in the editor on or off. For a full grammar and style check, use the <strong>File</strong> menu and choose the grammar/spell check option from there.</li>
          <li><strong>Project title.</strong> In the header, click the current project name (e.g. “Untitled Script”). You can then type a new name. This name appears in the browser tab and is used when you save or export the project.</li>
          <li><strong>Title Page.</strong> Click the <strong>File</strong> menu (hamburger icon in the header), then click <strong>Title Page</strong>. The title page editor opens in a dialog. Here you set the script title, episode title (for TV), credit line, author, draft/version, and contact info that appear on the first page of a printed or exported script.</li>
          <li><strong>Fill title page.</strong> In the Title Page dialog, fill in: <strong>Title</strong> (or series name for TV); for TV, <strong>Episode Title</strong>; <strong>Credit</strong> (e.g. “by”); <strong>Author</strong>; <strong>Draft/Version</strong> (e.g. Draft 1.0); and <strong>Contact info</strong> (email, phone, or agent). When you’re done, click <strong>Close</strong>. This title page is included automatically when you export to PDF.</li>
          <li><em>You’re ready to write.</em></li>
        </ol>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import Dialog from 'primevue/dialog'

const store = useProjectStore()

const showManual = ref(false)

const visible = computed({
  get: () => store.showTrainingChoiceDialog,
  set: (val) => { store.showTrainingChoiceDialog = val },
})

const isTV = computed(() => store.activeProject?.format === 'TV Show')

function startInteractive() {
  store.showTrainingChoiceDialog = false
  store.showInteractiveTraining = true
}
</script>

<style scoped>
.training-choice-intro {
  margin: 0 0 1rem 0;
  color: var(--p-text-color);
}
.training-choice-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.training-choice-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--p-surface-border);
  border-radius: 8px;
  background: var(--p-surface-50);
  color: var(--p-text-color);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}
.training-choice-option:hover {
  background: var(--p-surface-100);
  border-color: var(--p-primary-color);
}
.training-choice-option i {
  font-size: 1.5rem;
  color: var(--p-primary-color);
}
.option-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.training-choice-option .option-label {
  font-weight: 600;
  font-size: 1.05rem;
}
.training-choice-option .option-desc {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  margin-top: 0.2rem;
}
.training-manual-header {
  margin-bottom: 0.75rem;
}
.training-manual-back {
  background: none;
  border: none;
  color: var(--p-primary-color);
  cursor: pointer;
  padding: 0.25rem 0;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}
.training-manual-back:hover {
  text-decoration: underline;
}
.training-manual-title {
  margin: 0;
  font-size: 1.1rem;
}
.training-manual-content {
  max-height: 60vh;
  overflow-y: auto;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
.training-manual-steps {
  margin: 0;
  padding-left: 2.25rem;
  line-height: 1.6;
}
.training-manual-steps li {
  margin-bottom: 0.5rem;
}
</style>
