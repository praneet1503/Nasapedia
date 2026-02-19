'use client'

import { useRouter } from 'next/navigation'

export default function TopNav() {
  const router = useRouter()

  return (
    <div className="ml-2 flex gap-2">
      <button type="button" onClick={() => router.push('/')} className="space-btn text-sm">
        🌍 All Projects
      </button>

      <button type="button" onClick={() => router.push('/feed')} className="space-btn text-sm">
        🛠️ View Feed
      </button>

      <button type="button" onClick={() => router.push('/iss-tracker')} className="space-btn text-sm">
        🛰️ ISS Tracker
      </button>

      {/* Search removed per request */}
    </div>
  )
}
