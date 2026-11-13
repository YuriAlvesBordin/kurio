import * as React from 'react'
import { cn } from '@/lib/utils'

const fieldClass =
  'w-full border border-line bg-transparent px-3 text-sm text-fg-strong placeholder:text-subtle focus-visible:border-primary focus-visible:outline-none aria-[invalid=true]:border-danger disabled:opacity-50'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldClass, 'h-10', className)} {...props} />
))
Input.displayName = 'Input'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClass, 'min-h-24 py-2', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export { Input, Textarea }
