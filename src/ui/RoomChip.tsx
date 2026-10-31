/** Room number, bold, in a grey chip (Lance style). */
export function RoomChip({ id, size = 'md' }: { id: string; size?: 'md' | 'lg' }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-[10px] bg-chip font-bold tabular-nums ${size === 'lg' ? 'h-12 min-w-14 px-3 text-[20px]' : 'h-10 min-w-12 px-2.5 text-[17px]'}`}>
      {id}
    </span>
  )
}
