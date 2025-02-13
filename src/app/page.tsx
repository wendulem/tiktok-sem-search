'use client'
// import Image from "next/image";
// import { useSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
// import { useRouter } from 'next/navigation'
import VideoSearch from '@/components/VideoSearch'

export default function Home() {
  const session = useSession()
  const supabase = useSupabaseClient()
  // const router = useRouter()

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <button
          onClick={() => supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
              scopes: 'identify',
              redirectTo: `${window.location.origin}/auth/callback`
            }
          })}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign in Discord
        </button>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="flex justify-between w-full max-w-4xl mb-8">
        <h1 className="text-2xl font-bold">Video Search</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign Out
        </button>
      </div>
      {session && <VideoSearch />}
    </main>
  )
}
