const COLORS: Record<string, string> = {
  MC: 'bg-[#B7C9A8] text-[#2F4A23]',
  PP: 'bg-[#C9B1C9] text-[#4A2A4A]',
  RA: 'bg-[#9FB0C4] text-[#22344A]',
  JB: 'bg-[#E3C9A0] text-[#5A3E12]',
}

/** Initials avatar. */
export function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${COLORS[initials] ?? 'bg-chip text-ink'}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  )
}
