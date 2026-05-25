'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Dumbbell,
  BarChart3,
  Heart,
} from 'lucide-react'
import Dashboard from '@/components/dashboard'
import WorkoutView from '@/components/workout-view'
import ProgressView from '@/components/progress-view'
import { PainDialog } from '@/components/pain-dialog'

type TabId = 'dashboard' | 'workout' | 'progress'

interface TabConfig {
  id: TabId
  label: string
  icon: React.ElementType
}

const TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [showPainDialog, setShowPainDialog] = useState(false)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabId)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard setActiveTab={handleTabChange} />
            )}
            {activeTab === 'workout' && (
              <WorkoutView />
            )}
            {activeTab === 'progress' && (
              <ProgressView />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-t border-border/50">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col items-center justify-center gap-0.5 w-16 h-12
                    rounded-xl transition-all duration-200
                    ${isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                  aria-label={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {tab.label}
                  </span>
                </button>
              )
            })}

            {/* Pain Report Button */}
            <button
              onClick={() => setShowPainDialog(true)}
              className={`
                flex flex-col items-center justify-center gap-0.5 w-16 h-12
                rounded-xl transition-all duration-200
                text-rose-400/70 hover:text-rose-500
              `}
              aria-label="Report Pain"
            >
              <Heart className="w-5 h-5" />
              <span className="text-[10px] font-medium text-rose-400/70">Pain</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Pain Dialog */}
      <PainDialog
        open={showPainDialog}
        onOpenChange={setShowPainDialog}
      />
    </div>
  )
}
