import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'lg' | 'md' | 'sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white active:bg-black/80 disabled:bg-black/25',
  secondary: 'bg-white text-ink border border-line active:bg-chip disabled:text-muted',
  ghost: 'bg-transparent text-ink active:bg-chip disabled:text-muted',
  danger: 'bg-white text-danger border border-danger/30 active:bg-danger-soft',
}
const SIZES: Record<Size, string> = {
  lg: 'h-[52px] px-6 text-[16px]',
  md: 'h-12 px-5 text-[15px]',
  sm: 'h-10 px-4 text-[14px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
}

/** Lance pill button. Primary = black pill; secondary = white pill with light border. */
export function Button({ variant = 'primary', size = 'md', block, className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors select-none disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  )
}
