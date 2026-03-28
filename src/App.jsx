import React, { useState } from 'react'
import Navbar from './components/Navbar'
import GoalCard from './components/GoalCard'
import ChatPanel from './components/ChatPanel'
import DataPanel from './components/DataPanel'
import { useAppData } from './data/useAppData'

const INITIAL_GOALS = [
  {
    id: 1,
    metric: 'Monthly Revenue',
    owner: 'Store #042 — Chicago',
    currentValue: '$128,000',
    previousValue: '$122,500',
    changePercent: 4.5,
    progress: 91,
    month: 'March 2025',
    isNew: false,
  },
  {
    id: 2,
    metric: 'Customer Footfall',
    owner: 'Store #042 — Chicago',
    currentValue: '3,400 visits',
    previousValue: '3,150 visits',
    changePercent: 7.9,
    progress: 85,
    month: 'March 2025',
    isNew: false,
  },
  {
    id: 3,
    metric: 'Units Sold',
    owner: 'Store #042 — Chicago',
    currentValue: '6,820 units',
    previousValue: '6,400 units',
    changePercent: 6.6,
    progress: 80,
    month: 'March 2025',
    isNew: false,
  },
]

export default function App() {
  const [goals, setGoals] = useState(INITIAL_GOALS)
  const [activeTab, setActiveTab] = useState('goals')
  const appData = useAppData()

  function handleGoalCreated(newGoal) {
    setGoals(prev => [{ ...newGoal, id: Date.now(), isNew: true }, ...prev])
  }

  function handleGoalUpdated(updatedGoal) {
    setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g))
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Data Dashboard — always mounted, hidden when not active ── */}
      <div className={`flex flex-1 overflow-hidden p-4 ${activeTab === 'data' ? 'flex' : 'hidden'}`}>
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {appData.loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading data...</div>
          ) : appData.error ? (
            <div className="flex-1 flex items-center justify-center text-red-400 text-sm">Error: {appData.error}</div>
          ) : (
            <DataPanel
              stores={appData.stores}
              departments={appData.departments}
              employees={appData.employees}
              metrics={appData.metrics}
            />
          )}
        </div>
      </div>

      {/* ── Goals + Chat — always mounted, hidden when not active ── */}
      <div className={`flex flex-1 overflow-hidden gap-4 p-4 ${activeTab === 'goals' ? 'flex' : 'hidden'}`}>
        {/* Left Panel — Active Goals */}
        <div className="w-[40%] min-w-[320px] flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">Active Goals</h2>
            <select className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none bg-white cursor-pointer hover:border-gray-300 transition-colors">
              <option>March 2025</option>
              <option>April 2025</option>
              <option>May 2025</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onUpdate={handleGoalUpdated} onMetricUpdate={appData.updateMetricTarget} />
            ))}
          </div>
        </div>

        {/* Right Panel — GoalBot Chat */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-w-0">
          <ChatPanel onGoalCreated={handleGoalCreated} appData={appData} />
        </div>
      </div>
    </div>
  )
}
