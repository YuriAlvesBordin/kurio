import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value

interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  iconSrc?: string
  iconSize?: number
  iconClassName?: string
}

const SelectTrigger = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Trigger>, SelectTriggerProps>(
  ({ className, children, iconSrc = '/assets/icons/select-arrow.svg', iconSize = 12, iconClassName, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn('relative flex h-10 w-full items-center justify-between gap-2 border border-line bg-transparent px-3 text-sm text-fg-strong focus-visible:border-primary focus-visible:outline-none data-[placeholder]:text-subtle', className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <img src={iconSrc} alt="" width={iconSize} height={iconSize} className={iconClassName} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  ),
)
SelectTrigger.displayName = 'SelectTrigger'

const SelectContent = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(
  ({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        sideOffset={4}
        className={cn('z-[60] min-w-[var(--radix-select-trigger-width)] border border-line-soft bg-raised text-fg shadow-lg', className)}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ),
)
SelectContent.displayName = 'SelectContent'

const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn('flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none data-[highlighted]:bg-dark data-[highlighted]:text-accent data-[state=checked]:text-accent', className)}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  ),
)
SelectItem.displayName = 'SelectItem'

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem }
