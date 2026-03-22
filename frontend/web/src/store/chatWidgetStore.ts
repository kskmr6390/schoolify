import { create } from 'zustand'

interface ChatWidgetStore {
  isOpen: boolean
  open:   () => void
  close:  () => void
  toggle: () => void
}

export const useChatWidgetStore = create<ChatWidgetStore>((set) => ({
  isOpen: false,
  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
  toggle: () => set(s => ({ isOpen: !s.isOpen })),
}))
