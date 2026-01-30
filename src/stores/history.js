// src/stores/history.js
import { defineStore } from 'pinia'

export const useHistoryStore = defineStore('history', {
  state: () => ({
    undoStack: [],
    redoStack: [],
    maxStackSize: 50,
    isUndoing: false,
    isRedoing: false,
  }),

  actions: {
    pushState(projectId, state) {
      if (this.isUndoing || this.isRedoing) return

      // Create a deep copy of the state
      const stateCopy = JSON.parse(JSON.stringify(state))

      // Add to undo stack
      this.undoStack.push({
        projectId,
        state: stateCopy,
        timestamp: Date.now(),
      })

      // Limit stack size
      if (this.undoStack.length > this.maxStackSize) {
        this.undoStack.shift()
      }

      // Clear redo stack when new action is performed
      this.redoStack = []
    },

    undo(projectId) {
      if (this.undoStack.length === 0) return null

      this.isUndoing = true

      // Find the last state for this project
      const lastIndex = this.findLastStateIndex(this.undoStack, projectId)
      if (lastIndex === -1) {
        this.isUndoing = false
        return null
      }

      const historyItem = this.undoStack.splice(lastIndex, 1)[0]
      this.redoStack.push(historyItem)

      this.isUndoing = false
      return historyItem.state
    },

    redo(projectId) {
      if (this.redoStack.length === 0) return null

      this.isRedoing = true

      // Find the last state for this project
      const lastIndex = this.findLastStateIndex(this.redoStack, projectId)
      if (lastIndex === -1) {
        this.isRedoing = false
        return null
      }

      const historyItem = this.redoStack.splice(lastIndex, 1)[0]
      this.undoStack.push(historyItem)

      this.isRedoing = false
      return historyItem.state
    },

    findLastStateIndex(stack, projectId) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].projectId === projectId) {
          return i
        }
      }
      return -1
    },

    clearHistory(projectId) {
      this.undoStack = this.undoStack.filter((item) => item.projectId !== projectId)
      this.redoStack = this.redoStack.filter((item) => item.projectId !== projectId)
    },

    canUndo(projectId) {
      return this.findLastStateIndex(this.undoStack, projectId) !== -1
    },

    canRedo(projectId) {
      return this.findLastStateIndex(this.redoStack, projectId) !== -1
    },
  },
})
