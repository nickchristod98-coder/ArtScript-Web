// src/stores/project.js - ENHANCED VERSION
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { useHistoryStore } from './history'

export const useProjectStore = defineStore('project', {
  state: () => ({
    projects: [],
    activeProjectId: null,

    // Global UI Settings
    darkMode: false,
    sceneNavVisible: true,
    episodeNavVisible: false,
    characterPanelVisible: false,
    fullPageView: false,

    // Tools State
    showPDFDialog: false,
    showPreviewDialog: false,
    showTitleDialog: false,
    showCharacterReplace: false,
    showTimeReminder: false,
    showFindReplace: false,
    showScriptAnalysis: false,
    showSpellGrammarDialog: false,
    showTrainingDialog: false,

    // Settings
    autoSaveInterval: 30000, // 30 seconds
    enableAutoComplete: true,
    showSceneNumbers: true,
    spellCheckEnabled: true, // Native browser spellcheck on editor lines
    spellGrammarLanguage: 'en-US', // Language code for grammar check (e.g. en-US, en-GB)
    
    // Scene navigation
    selectedSceneId: null, // Track manually selected scene, null means highlight last scene
    // Left sidebar content: 'scenes' | 'characters'
    sidebarView: 'scenes',
  }),

  getters: {
    activeProject: (state) => state.projects.find((p) => p.id === state.activeProjectId),

    activeScenes: (state) => {
      const project = state.projects.find((p) => p.id === state.activeProjectId)
      if (!project) return []

      // For Book format, use chapter-title; for others, use scene-heading
      const filterType = project.format === 'Book' ? 'chapter-title' : 'scene-heading'

      return project.lines
        .map((line, index) => ({ line, index }))
        .filter((item) => item.line.type === filterType)
        .map((item, i) => ({
          id: item.line.id,
          title:
            item.line.content ||
            (project.format === 'Book' ? `Chapter ${i + 1}` : 'UNTITLED SCENE'),
          index: item.index,
          number: i + 1,
        }))
    },

    activeEpisodes: (state) => {
      const project = state.projects.find((p) => p.id === state.activeProjectId)
      if (project && project.format === 'TV Show' && project.seasons) {
        // Return all episodes from all seasons, flattened with season info
        const allEpisodes = []
        project.seasons.forEach((season) => {
          season.episodes.forEach((episode) => {
            allEpisodes.push({
              ...episode,
              seasonNumber: season.seasonNumber,
            })
          })
        })
        return allEpisodes
      }
      return []
    },

    activeSeasons: (state) => {
      const project = state.projects.find((p) => p.id === state.activeProjectId)
      if (project && project.format === 'TV Show' && project.seasons) {
        return project.seasons
      }
      return []
    },

    // Get all characters with their data
    allCharacters: (state) => {
      const project = state.projects.find((p) => p.id === state.activeProjectId)
      if (!project) return []

      const chars = new Set()
      project.lines.forEach((line) => {
        if (line.type === 'character') {
          chars.add(line.content.trim().toUpperCase())
        }
      })

      return Array.from(chars).sort()
    },

    // Script statistics
    scriptStats: (state) => {
      const project = state.projects.find((p) => p.id === state.activeProjectId)
      if (!project) return null

      const stats = {
        totalLines: project.lines.length,
        sceneCount: 0,
        pageCount: 1, // Will be calculated below
        characterCount: new Set(),
        dialogueLines: 0,
        actionLines: 0,
        wordCount: 0,
      }

      // Calculate page count based on line spacing (similar to PreviewDialog)
      const LINE_HEIGHT = 14.4 // pt
      const PAGE_HEIGHT = 792 - 144 // 792pt page - 72pt top and bottom margins
      const TOP_MARGIN = 72
      
      const getLineSpacing = (type) => {
        switch (type) {
          case 'scene-heading':
            return { before: 24, after: 12 }
          case 'action':
            return { before: 0, after: 12 }
          case 'character':
            return { before: 12, after: 0 }
          case 'dialogue':
            return { before: 0, after: 12 }
          case 'parenthetical':
            return { before: 0, after: 0 }
          case 'transition':
            return { before: 12, after: 12 }
          default:
            return { before: 0, after: 12 }
        }
      }

      let currentHeight = TOP_MARGIN
      let pageCount = 1

      project.lines.forEach((line) => {
        if (line.type === 'scene-heading') stats.sceneCount++
        if (line.type === 'character') stats.characterCount.add(line.content.trim())
        if (line.type === 'dialogue') stats.dialogueLines++
        if (line.type === 'action') stats.actionLines++

        stats.wordCount += line.content.split(/\s+/).filter(Boolean).length

        // Calculate page breaks
        const spacing = getLineSpacing(line.type)
        
        // Add spacing before (if not first line on page)
        if (currentHeight > TOP_MARGIN) {
          currentHeight += spacing.before
        }
        
        // Check if line fits on current page
        const lineTotalHeight = LINE_HEIGHT + spacing.after
        if (currentHeight + lineTotalHeight > PAGE_HEIGHT && currentHeight > TOP_MARGIN) {
          // Start new page
          pageCount++
          currentHeight = TOP_MARGIN + spacing.before + lineTotalHeight
        } else {
          // Add line to current page
          currentHeight += lineTotalHeight
        }
      })

      stats.pageCount = pageCount
      stats.characterCount = stats.characterCount.size

      return stats
    },
  },

  actions: {
    createProject(format = 'Film') {
      const newProject = {
        id: uuidv4(),
        name:
          format === 'Book'
            ? 'Untitled Book'
            : format === 'TV Show'
              ? 'Untitled TV Show'
              : 'Untitled Script',
        format: format,
        lines: this.createInitialLines(format),
        titlePage: {
          title: '',
          credit: '',
          author: '',
          contact: '',
          draft: '',
        },
        characters: new Set(),
        characterData: {},

        // Metadata
        createdAt: Date.now(),
        updatedAt: Date.now(),

        // TV Specifics - Season-based structure
        seasons: [{ seasonNumber: 1, episodes: [] }],
        activeSeasonIndex: 0,
        activeEpisodeId: null,

        // Notes and tags
        notes: [],
        tags: [],
        // Inline annotations (notes on selected text)
        annotations: [],

        // Revision tracking
        revisions: [],
        currentRevision: null,
      }

      if (format === 'TV Show') {
        const epId = uuidv4()
        newProject.seasons[0].episodes.push({
          id: epId,
          name: 'Episode 1',
          lines: this.createInitialLines(format),
          titlePage: {
            episodeTitle: '',
          },
        })
        newProject.activeSeasonIndex = 0
        newProject.activeEpisodeId = epId
        newProject.lines = newProject.seasons[0].episodes[0].lines
        this.episodeNavVisible = true
      } else {
        this.episodeNavVisible = false
      }

      this.projects.push(newProject)
      this.activeProjectId = newProject.id

      // Save initial state to history
      this.pushToHistory()

      return newProject.id
    },

    createInitialLines(format) {
      if (format === 'Book') {
        return [
          {
            id: uuidv4(),
            type: 'body-text',
            content: '',
          },
        ]
      }
      return [
        {
          id: uuidv4(),
          type: 'action',
          content: '',
        },
      ]
    },

    // Enhanced updateLine with history tracking
    updateLine(lineId, content, type = null) {
      if (!this.activeProject) return

      const line = this.activeProject.lines.find((l) => l.id === lineId)
      if (line) {
        // Push current state to history before changing
        this.pushToHistory()

        line.content = content
        if (type) line.type = type

        if (line.type === 'character') {
          this.activeProject.characters.add(content.trim().toUpperCase())
        }

        this.activeProject.updatedAt = Date.now()
      }
    },

    addLine(afterLineId, type) {
      if (!this.activeProject) return

      this.pushToHistory()

      const index = this.activeProject.lines.findIndex((l) => l.id === afterLineId)
      const newLine = { id: uuidv4(), type, content: '' }

      if (index !== -1) {
        this.activeProject.lines.splice(index + 1, 0, newLine)
      }

      this.activeProject.updatedAt = Date.now()
      return newLine
    },

    deleteLine(lineId) {
      if (!this.activeProject) return

      this.pushToHistory()

      const index = this.activeProject.lines.findIndex((l) => l.id === lineId)
      if (index !== -1 && this.activeProject.lines.length > 1) {
        this.activeProject.lines.splice(index, 1)
      }

      this.activeProject.updatedAt = Date.now()
    },

    // Undo/Redo integration
    pushToHistory() {
      if (!this.activeProject) return

      const historyStore = useHistoryStore()
      historyStore.pushState(this.activeProjectId, {
        lines: JSON.parse(JSON.stringify(this.activeProject.lines)),
        characters: Array.from(this.activeProject.characters),
      })
    },

    undo() {
      if (!this.activeProject) return

      const historyStore = useHistoryStore()
      const previousState = historyStore.undo(this.activeProjectId)

      if (previousState) {
        this.activeProject.lines = previousState.lines
        this.activeProject.characters = new Set(previousState.characters)
      }
    },

    redo() {
      if (!this.activeProject) return

      const historyStore = useHistoryStore()
      const nextState = historyStore.redo(this.activeProjectId)

      if (nextState) {
        this.activeProject.lines = nextState.lines
        this.activeProject.characters = new Set(nextState.characters)
      }
    },

    canUndo() {
      const historyStore = useHistoryStore()
      return historyStore.canUndo(this.activeProjectId)
    },

    canRedo() {
      const historyStore = useHistoryStore()
      return historyStore.canRedo(this.activeProjectId)
    },

    // Scene management
    moveScene(fromIndex, toIndex) {
      if (!this.activeProject) return

      this.pushToHistory()

      const scenes = this.activeScenes
      if (fromIndex < 0 || fromIndex >= scenes.length) return
      if (toIndex < 0 || toIndex >= scenes.length) return

      const fromScene = scenes[fromIndex]
      const toScene = scenes[toIndex]

      // Get all lines for the scene
      const fromSceneLines = this.getLinesForScene(fromScene.index)
      const toSceneLines = this.getLinesForScene(toScene.index)

      // Remove from scene lines
      this.activeProject.lines.splice(fromScene.index, fromSceneLines.length)

      // Insert at new position
      const insertIndex = toIndex > fromIndex ? toScene.index : toScene.index
      this.activeProject.lines.splice(insertIndex, 0, ...fromSceneLines)
    },

    getLinesForScene(sceneIndex) {
      const lines = []
      const filterType = this.activeProject.format === 'Book' ? 'chapter-title' : 'scene-heading'

      for (let i = sceneIndex; i < this.activeProject.lines.length; i++) {
        lines.push(this.activeProject.lines[i])

        // Stop at next scene
        if (i > sceneIndex && this.activeProject.lines[i].type === filterType) {
          break
        }
      }

      return lines
    },

    // Season management (TV Shows)
    addNewSeason() {
      if (!this.activeProject || this.activeProject.format !== 'TV Show') return

      this.saveCurrentEpisode()

      const newSeasonNumber = this.activeProject.seasons.length + 1
      const newSeason = {
        seasonNumber: newSeasonNumber,
        episodes: [],
      }

      this.activeProject.seasons.push(newSeason)
      this.activeProject.activeSeasonIndex = this.activeProject.seasons.length - 1
      this.activeProject.activeEpisodeId = null
      this.activeProject.lines = []
    },

    // Episode management (TV Shows)
    addEpisode(seasonIndex = null) {
      if (!this.activeProject || this.activeProject.format !== 'TV Show') return

      this.saveCurrentEpisode()

      // Use provided seasonIndex or current active season
      const targetSeasonIndex = seasonIndex !== null ? seasonIndex : this.activeProject.activeSeasonIndex
      const season = this.activeProject.seasons[targetSeasonIndex]
      if (!season) return

      const newEpId = uuidv4()
      // Episode numbering resets per season (S01E01, S02E01, etc.)
      const newEpName = `Episode ${season.episodes.length + 1}`

      const newEpisode = {
        id: newEpId,
        name: newEpName,
        lines: this.createInitialLines('TV Show'),
        titlePage: {
          episodeTitle: '',
        },
      }

      season.episodes.push(newEpisode)
      this.activeProject.activeSeasonIndex = targetSeasonIndex
      this.switchEpisode(newEpId, targetSeasonIndex)
    },

    switchEpisode(episodeId, seasonIndex = null) {
      if (!this.activeProject) return

      this.saveCurrentEpisode()

      // Find episode across all seasons if seasonIndex not provided
      let episode = null
      let foundSeasonIndex = null

      if (seasonIndex !== null) {
        const season = this.activeProject.seasons[seasonIndex]
        if (season) {
          episode = season.episodes.find((e) => e.id === episodeId)
          if (episode) foundSeasonIndex = seasonIndex
        }
      } else {
        // Search all seasons
        for (let i = 0; i < this.activeProject.seasons.length; i++) {
          const season = this.activeProject.seasons[i]
          episode = season.episodes.find((e) => e.id === episodeId)
          if (episode) {
            foundSeasonIndex = i
            break
          }
        }
      }

      if (episode && foundSeasonIndex !== null) {
        this.activeProject.activeSeasonIndex = foundSeasonIndex
        this.activeProject.activeEpisodeId = episodeId
        this.activeProject.lines = JSON.parse(JSON.stringify(episode.lines))
      }
    },

    saveCurrentEpisode() {
      if (!this.activeProject || this.activeProject.format !== 'TV Show') return

      const season = this.activeProject.seasons[this.activeProject.activeSeasonIndex]
      if (!season) return

      const currentEpIndex = season.episodes.findIndex(
        (e) => e.id === this.activeProject.activeEpisodeId,
      )

      if (currentEpIndex !== -1) {
        season.episodes[currentEpIndex].lines = JSON.parse(
          JSON.stringify(this.activeProject.lines),
        )
      }
    },

    // Notes management
    addNote(lineId, content, type = 'general') {
      if (!this.activeProject) return

      if (!this.activeProject.notes) {
        this.activeProject.notes = []
      }

      this.activeProject.notes.push({
        id: uuidv4(),
        lineId,
        content,
        type,
        createdAt: Date.now(),
      })
    },

    deleteNote(noteId) {
      if (!this.activeProject || !this.activeProject.notes) return

      const index = this.activeProject.notes.findIndex((n) => n.id === noteId)
      if (index !== -1) {
        this.activeProject.notes.splice(index, 1)
      }
    },

    addAnnotation({ lineId, anchorText, noteContent }) {
      if (!this.activeProject) return
      if (!this.activeProject.annotations) {
        this.activeProject.annotations = []
      }
      this.activeProject.annotations.push({
        id: uuidv4(),
        lineId,
        anchorText: anchorText || '',
        noteContent: noteContent || '',
        createdAt: Date.now(),
      })
      this.activeProject.updatedAt = Date.now()
    },

    deleteAnnotation(annotationId) {
      if (!this.activeProject || !this.activeProject.annotations) return
      const index = this.activeProject.annotations.findIndex((a) => a.id === annotationId)
      if (index !== -1) {
        this.activeProject.annotations.splice(index, 1)
        this.activeProject.updatedAt = Date.now()
      }
    },

    // Project management
    closeProject(id) {
      const index = this.projects.findIndex((p) => p.id === id)
      if (index !== -1) {
        // Clear history for this project
        const historyStore = useHistoryStore()
        historyStore.clearHistory(id)

        this.projects.splice(index, 1)

        if (this.activeProjectId === id) {
          this.activeProjectId =
            this.projects.length > 0 ? this.projects[this.projects.length - 1].id : null
        }
      }
    },

    toggleDarkMode() {
      this.darkMode = !this.darkMode
      if (this.darkMode) {
        document.body.classList.add('dark-mode')
      } else {
        document.body.classList.remove('dark-mode')
      }
    },

    toggleFullPageView() {
      this.fullPageView = !this.fullPageView
      // The class will be applied to the editor component directly, not body
    },

    // File I/O
    saveToRecentProjects(projectId) {
      const project = this.projects.find((p) => p.id === projectId)
      if (!project) return

      const saved = localStorage.getItem('recentProjects')
      let recent = saved ? JSON.parse(saved) : []

      recent = recent.filter((p) => p.id !== projectId)

      recent.unshift({
        id: projectId,
        name: project.name,
        format: project.format,
        lastAccessed: Date.now(),
      })

      localStorage.setItem('recentProjects', JSON.stringify(recent.slice(0, 10)))
    },

    loadRecentProjects() {
      const saved = localStorage.getItem('recentProjects')
      return saved ? JSON.parse(saved) : []
    },

    exportProjectAsJSON() {
      if (!this.activeProject) return

      const data = {
        version: '2.0',
        projectName: this.activeProject.name,
        format: this.activeProject.format,
        lines: this.activeProject.lines,
        seasons: this.activeProject.seasons,
        activeSeasonIndex: this.activeProject.activeSeasonIndex,
        titlePage: this.activeProject.titlePage,
        characterData: this.activeProject.characterData,
        notes: this.activeProject.notes,
        tags: this.activeProject.tags,
        annotations: this.activeProject.annotations || [],
        createdAt: this.activeProject.createdAt,
        updatedAt: this.activeProject.updatedAt,
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.activeProject.name.replace(/\s+/g, '_')}.asxpro`
      a.click()
      URL.revokeObjectURL(url)
    },

    importProjectFromJSON(jsonContent, fileName) {
      try {
        const data = JSON.parse(jsonContent)
        const newId = this.createProject(data.format || 'Film')
        const project = this.projects.find((p) => p.id === newId)

        project.name = data.projectName || fileName.replace(/\.(asxpro|artsc|json)$/i, '')
        project.lines = data.lines || []
        project.titlePage = data.titlePage || project.titlePage
        project.characterData = data.characterData || {}
        project.notes = data.notes || []
        project.tags = data.tags || []
        project.annotations = data.annotations || []
        project.createdAt = data.createdAt || Date.now()
        project.updatedAt = data.updatedAt || Date.now()

        // Handle both old episodes format and new seasons format for backward compatibility
        if (data.seasons) {
          // Ensure each episode has titlePage structure
          project.seasons = data.seasons.map((season) => ({
            ...season,
            episodes: (season.episodes || []).map((ep) => ({
              ...ep,
              titlePage: ep.titlePage || { episodeTitle: '' },
            })),
          }))
          project.activeSeasonIndex = data.activeSeasonIndex !== undefined ? data.activeSeasonIndex : 0
          // Load active episode's lines if available
          const activeSeason = project.seasons[project.activeSeasonIndex]
          if (activeSeason && project.activeEpisodeId) {
            const activeEpisode = activeSeason.episodes.find((e) => e.id === project.activeEpisodeId)
            if (activeEpisode) {
              project.lines = JSON.parse(JSON.stringify(activeEpisode.lines))
            }
          } else if (activeSeason && activeSeason.episodes.length > 0) {
            // Default to first episode if no active episode set
            project.activeEpisodeId = activeSeason.episodes[0].id
            project.lines = JSON.parse(JSON.stringify(activeSeason.episodes[0].lines))
          }
        } else if (data.episodes) {
          // Migrate old episodes format to seasons format
          // Ensure each episode has titlePage structure
          const migratedEpisodes = data.episodes.map((ep) => ({
            ...ep,
            titlePage: ep.titlePage || { episodeTitle: '' },
          }))
          project.seasons = [{ seasonNumber: 1, episodes: migratedEpisodes }]
          project.activeSeasonIndex = 0
          if (migratedEpisodes.length > 0 && migratedEpisodes[0].id) {
            project.activeEpisodeId = migratedEpisodes[0].id
            project.lines = JSON.parse(JSON.stringify(migratedEpisodes[0].lines))
          }
        }

        project.lines.forEach((l) => {
          if (l.type === 'character') {
            project.characters.add(l.content.trim().toUpperCase())
          }
        })

        return newId
      } catch (e) {
        console.error('Failed to load project', e)
        alert('Invalid file format')
        return null
      }
    },

    // Export to Fountain format
    exportToFountain() {
      if (!this.activeProject) return

      let fountain = ''

      // Add title page
      if (this.activeProject.titlePage.title) {
        fountain += `Title: ${this.activeProject.titlePage.title}\n`
      }
      if (this.activeProject.titlePage.author) {
        fountain += `Author: ${this.activeProject.titlePage.author}\n`
      }
      if (this.activeProject.titlePage.draft) {
        fountain += `Draft: ${this.activeProject.titlePage.draft}\n`
      }
      if (this.activeProject.titlePage.contact) {
        fountain += `Contact: ${this.activeProject.titlePage.contact}\n`
      }
      fountain += '\n'

      // Add content
      this.activeProject.lines.forEach((line) => {
        switch (line.type) {
          case 'scene-heading':
            fountain += `${line.content}\n\n`
            break
          case 'action':
            fountain += `${line.content}\n\n`
            break
          case 'character':
            fountain += `${line.content}\n`
            break
          case 'dialogue':
            fountain += `${line.content}\n\n`
            break
          case 'parenthetical':
            fountain += `(${line.content})\n`
            break
          case 'transition':
            fountain += `> ${line.content}\n\n`
            break
          default:
            fountain += `${line.content}\n\n`
        }
      })

      const blob = new Blob([fountain], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.activeProject.name.replace(/\s+/g, '_')}.fountain`
      a.click()
      URL.revokeObjectURL(url)
    },

    // Import from Fountain format
    importProjectFromFountain(fountainContent, fileName) {
      try {
        // Strip BEAT metadata block (/* ... BEAT: ... END_BEAT */) - app settings, not screenplay text
        fountainContent = fountainContent
          .replace(/\/\*[\s\S]*?BEAT:[\s\S]*?END_BEAT\s*\*\//g, '')
          .trim()

        const lines = fountainContent.split('\n')
        const newId = this.createProject('Film')
        const project = this.projects.find((p) => p.id === newId)

        project.name = fileName.replace('.fountain', '').replace('.fnt', '')
        
        const projectLines = []
        let titlePage = {
          title: '',
          credit: '',
          author: '',
          contact: '',
          draft: '',
        }
        let inTitlePage = true
        let currentCharacter = null
        let currentDialogue = null

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          
          // Skip empty lines in title page
          if (inTitlePage && !line) {
            inTitlePage = false
            continue
          }

          // Parse title page metadata
          if (inTitlePage) {
            if (line.startsWith('Title:')) {
              titlePage.title = line.substring(6).trim()
              continue
            }
            if (line.startsWith('Author:')) {
              titlePage.author = line.substring(7).trim()
              continue
            }
            if (line.startsWith('Draft:')) {
              titlePage.draft = line.substring(6).trim()
              continue
            }
            if (line.startsWith('Contact:')) {
              titlePage.contact = line.substring(8).trim()
              continue
            }
            // If we hit content that doesn't start with metadata, exit title page
            if (line && !line.includes(':')) {
              inTitlePage = false
            }
          }

          // Skip empty lines after title page
          if (!inTitlePage && !line) {
            continue
          }

          // Parse content lines
          if (!inTitlePage) {
            const upper = line.toUpperCase()
            const lower = line.toLowerCase()
            const isFirstContentLine = projectLines.length === 0

            // Scene heading: INT./EXT./ΕΣΩ./ΕΞΩ./έσω./έξω. (and variants) – always force on first line when present
            const isSceneHeading =
              upper.startsWith('INT.') || upper.startsWith('EXT.') ||
              upper.startsWith('ΕΣΩ.') || upper.startsWith('ΕΞΩ.') ||
              lower.startsWith('int.') || lower.startsWith('ext.') ||
              lower.startsWith('εσω.') || lower.startsWith('εξω.') ||
              line.startsWith('έσω.') || line.startsWith('έξω.') ||
              line.startsWith('Έσω.') || line.startsWith('Έξω.')
            if (isSceneHeading || (isFirstContentLine && /^(int\.|ext\.|εσω\.|εξω\.|έσω\.|έξω\.)/i.test(line))) {
              projectLines.push({
                id: uuidv4(),
                type: 'scene-heading',
                content: line,
              })
              currentCharacter = null
              currentDialogue = null
            }
            // Transition (starts with >)
            else if (line.startsWith('>')) {
              projectLines.push({
                id: uuidv4(),
                type: 'transition',
                content: line.substring(1).trim(),
              })
              currentCharacter = null
              currentDialogue = null
            }
            // Parenthetical (starts with ( and ends with ))
            else if (line.startsWith('(') && line.endsWith(')')) {
              projectLines.push({
                id: uuidv4(),
                type: 'parenthetical',
                content: line.substring(1, line.length - 1).trim(),
              })
            }
            // Character (all caps, not too long, followed by dialogue)
            else if (
              line === upper &&
              line.length > 0 &&
              line.length < 50 &&
              !line.includes('.') &&
              !line.includes(',')
            ) {
              // Check if next line is dialogue
              const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
              if (nextLine && nextLine !== upper && !nextLine.startsWith('(')) {
                currentCharacter = line
                projectLines.push({
                  id: uuidv4(),
                  type: 'character',
                  content: line,
                })
                continue
              } else {
                // Might be action in all caps
                projectLines.push({
                  id: uuidv4(),
                  type: 'action',
                  content: line,
                })
              }
            }
            // Dialogue (after character, or if previous was character)
            else if (currentCharacter && projectLines.length > 0 && projectLines[projectLines.length - 1].type === 'character') {
              projectLines.push({
                id: uuidv4(),
                type: 'dialogue',
                content: line,
              })
              currentDialogue = line
            }
            // Action (default)
            else {
              projectLines.push({
                id: uuidv4(),
                type: 'action',
                content: line,
              })
              currentCharacter = null
              currentDialogue = null
            }
          }
        }

        project.lines = projectLines.length > 0 ? projectLines : this.createInitialLines('Film')
        project.titlePage = titlePage
        project.updatedAt = Date.now()

        // Extract characters
        projectLines.forEach((l) => {
          if (l.type === 'character') {
            project.characters.add(l.content.trim().toUpperCase())
          }
        })

        return newId
      } catch (e) {
        console.error('Failed to load Fountain file', e)
        alert('Invalid Fountain file format')
        return null
      }
    },
  },
})
