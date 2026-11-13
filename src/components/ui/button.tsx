import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-ink hover:bg-accent',
        outline: 'border border-line-soft bg-transparent text-fg hover:border-primary hover:text-accent',
        ghost: 'bg-transparent text-fg hover:text-accent',
        danger: 'border border-danger text-danger hover:bg-danger/10',
      },
      size: {
        header: 'h-[35px] gap-[2px] px-2.5 text-base font-normal',
        filter: 'h-9 w-[92px] rounded-md text-base',
        hero: 'h-10 px-0 text-base',
        sm: 'h-9 px-5 text-sm',
        md: 'h-10 px-5 text-base',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, type, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp ref={ref} type={asChild ? undefined : (type ?? 'button')} className={cn(buttonVariants({ variant, size }), className)} {...props} />
})
Button.displayName = 'Button'

export { Button, buttonVariants }
