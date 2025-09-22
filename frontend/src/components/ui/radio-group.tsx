import * as React from "react"

interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

const RadioGroup = ({ value, onValueChange, className, children }: RadioGroupProps) => (
  <div className={className} role="radiogroup">
    {children}
  </div>
)

interface RadioGroupItemProps {
  value: string
  id?: string
  className?: string
}

const RadioGroupItem = ({ value, id, className }: RadioGroupItemProps) => (
  <input
    type="radio"
    id={id}
    value={value}
    className={`h-4 w-4 ${className || ''}`}
  />
)

export { RadioGroup, RadioGroupItem }