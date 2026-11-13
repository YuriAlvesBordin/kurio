import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '@/lib/utils'

const RadioGroup = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Root>, React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>>(
  ({ className, ...props }, ref) => <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-3', className)} {...props} />,
)
RadioGroup.displayName = 'RadioGroup'

const RadioGroupItem = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Item>, React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>>(
  ({ className, children, ...props }, ref) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn('border border-line bg-transparent text-left transition-colors data-[state=checked]:border-primary', className)}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  ),
)
RadioGroupItem.displayName = 'RadioGroupItem'

export { RadioGroup, RadioGroupItem }
