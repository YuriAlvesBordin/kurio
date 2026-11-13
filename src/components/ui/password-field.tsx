import * as React from 'react'
import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/utils'
import { TextField } from './field'

type PasswordFieldProps = Omit<React.ComponentProps<typeof TextField>, 'type'>

/**
 * Password input with a visibility toggle drawn inside the field.
 * Accepts every TextField prop so it works with react-hook-form registration.
 * @param props label, placeholder, error and native input props
 */
export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <TextField ref={ref} floating type={visible ? 'text' : 'password'} className={cn('[&_input]:pr-11', className)} {...props} />
      <button
        type="button"
        aria-label={visible ? 'Ocultar caracteres' : 'Mostrar caracteres'}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute bottom-[10px] right-3 flex h-5 w-5 items-center justify-center"
      >
        <Icon name="hide" size={20} />
      </button>
    </div>
  )
})
PasswordField.displayName = 'PasswordField'
