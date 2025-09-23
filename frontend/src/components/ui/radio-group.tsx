import * as React from "react"

interface RadioGroupContextType {
  value?: string
  onValueChange?: (value: string) => void
  name: string
}

const RadioGroupContext = React.createContext<RadioGroupContextType | undefined>(undefined)

interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

const RadioGroup = ({ value, onValueChange, className, children }: RadioGroupProps) => {
  const name = React.useId()

  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
      <div className={className} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

interface RadioGroupItemProps {
  value: string
  id?: string
  className?: string
}

const RadioGroupItem = ({ value, id, className }: RadioGroupItemProps) => {
  const context = React.useContext(RadioGroupContext)

  if (!context) {
    throw new Error("RadioGroupItem must be used within a RadioGroup")
  }

  const { value: groupValue, onValueChange, name } = context

  return (
    <input
      type="radio"
      id={id}
      name={name}
      value={value}
      checked={groupValue === value}
      onChange={() => onValueChange?.(value)}
      className={`h-4 w-4 ${className || ''}`}
    />
  )
}

export { RadioGroup, RadioGroupItem }