import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BottomSheet } from '../../ui'

/**
 * Local workaround (see CHANGES.md): the shell renders this page inside a scrolling, `relative` <main>,
 * so the shared BottomSheet (absolute inset-0) would anchor to the top of the scrolled content and
 * open off-screen when the card is further down. We portal it into the phone frame (main's parent),
 * which is where the shell's own sheet lives.
 */
export function FrameSheet(props: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [frame, setFrame] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    setFrame(anchor.current?.closest('main')?.parentElement ?? null)
  }, [])

  const sheet = <BottomSheet {...props} />
  return (
    <>
      <span ref={anchor} hidden />
      {frame ? createPortal(sheet, frame) : sheet}
    </>
  )
}
