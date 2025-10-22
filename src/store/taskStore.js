import { create } from 'zustand'

export const useTaskStore = create((set) => ({
  queuePosition: null,
  setQueuePosition: (pos) => set({ queuePosition: pos }),
}))