import * as React from 'react'
import { Input, Textarea } from './input'
import { Label } from './label'
import { cn } from '@/lib/utils'

/**
 * Renders a label and turns a trailing asterisk into the highlighted required marker.
 * @param text label text, optionally ending with an asterisk
 */
export function LabelText({ text }: { text: string }) {
  if (!text.endsWith(' *')) return <>{text}</>
  return (
    <>
      {text.slice(0, -1)}
      <span className="relative -top-0.5 -ml-1.5 text-[17px] leading-4 text-required">*</span>
    </>
  )
}

interface FieldProps {
  label: string
  error?: string
  hint?: string
  className?: string
  floating?: boolean
  hideLabel?: boolean
  hideLabelAlways?: boolean
  textareaClassName?: string
}

/**
 * Labelled input with an associated, announced error message.
 * @param props label, error and native input props
 */
export const TextField = React.forwardRef<HTMLInputElement, FieldProps & React.InputHTMLAttributes<HTMLInputElement>>(
  ({ label, error, hint, className, id, floating, hideLabel, hideLabelAlways, ...props }, ref) => {
    const generated = React.useId()
    const inputId = id ?? generated
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
    return (
      <div className={cn('flex flex-col gap-1.5', floating && 'relative', hideLabel && 'sm:pt-[22px]', className)}>
        <Label htmlFor={inputId} className={hideLabel || hideLabelAlways ? 'sr-only' : undefined}><LabelText text={label} /></Label>
        <Input ref={ref} id={inputId} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props} />
        {error ? (
          <p id={`${inputId}-error`} role="alert" className={cn('text-xs text-danger', floating && 'absolute left-0 top-full mt-0.5 leading-4')}>
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className={cn('text-xs text-subtle', floating && 'sr-only')}>
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)
TextField.displayName = 'TextField'

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, error, className, textareaClassName, id, ...props }, ref) => {
    const generated = React.useId()
    const inputId = id ?? generated
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <Label htmlFor={inputId}><LabelText text={label} /></Label>
        <Textarea ref={ref} id={inputId} className={textareaClassName} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
        {error ? (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)
TextAreaField.displayName = 'TextAreaField'
