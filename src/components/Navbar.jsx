import React from 'react'

const TABS = ['Goals', 'Data']
const STATIC_LINKS = ['Dashboard', 'Reports', 'Settings']

export default function Navbar({ activeTab, onTabChange }) {
  return (
    <nav className="flex-shrink-0 flex items-center gap-8 px-6 h-[52px] bg-white border-b border-gray-100 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">S</div>
        <span className="text-sm font-bold text-gray-900 tracking-tight">SmartGoals</span>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        {/* Static decorative links */}
        {STATIC_LINKS.slice(0, 1).map(link => (
          <a key={link} href="#" className="px-3 py-1.5 text-sm text-gray-400 font-medium rounded-md">{link}</a>
        ))}

        {/* Functional tabs */}
        {TABS.map(tab => {
          const isActive = activeTab === tab.toLowerCase()
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab.toLowerCase())}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'text-gray-900 font-semibold border-b-2 border-teal-600 rounded-none pb-[5px]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          )
        })}

        {/* Static decorative links */}
        {STATIC_LINKS.slice(1).map(link => (
          <a key={link} href="#" className="px-3 py-1.5 text-sm text-gray-400 font-medium rounded-md">{link}</a>
        ))}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer">M</div>
    </nav>
  )
}
