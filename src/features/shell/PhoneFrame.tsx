import type { ReactNode } from 'react'

/** One phone frame: full-bleed on a phone, centered ~430px on desktop. Sheets/toasts position inside it. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full justify-center bg-chip sm:items-center sm:py-6">
      <div id="phone-frame" className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-white font-sans sm:max-h-[900px] sm:rounded-[36px] sm:border sm:border-line sm:shadow-2xl">
        {children}
      </div>
    </div>
  )
}
