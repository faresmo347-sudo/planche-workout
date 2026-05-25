import { create } from 'zustand'

export type ViewTab = 'dashboard' | 'workout' | 'progress'

interface AppState {
  activeTab: ViewTab
  setActiveTab: (tab: ViewTab) => void
  isWorkoutActive: boolean
  setIsWorkoutActive: (active: boolean) => void
  currentSetIndex: number
  setCurrentSetIndex: (index: number) => void
  showPainDialog: boolean
  setShowPainDialog: (show: boolean) => void
  showFormGuide: string | null
  setShowFormGuide: (exerciseId: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isWorkoutActive: false,
  setIsWorkoutActive: (active) => set({ isWorkoutActive: active }),
  currentSetIndex: 0,
  setCurrentSetIndex: (index) => set({ currentSetIndex: index }),
  showPainDialog: false,
  setShowPainDialog: (show) => set({ showPainDialog: show }),
  showFormGuide: null,
  setShowFormGuide: (exerciseId) => set({ showFormGuide: exerciseId }),
}))
