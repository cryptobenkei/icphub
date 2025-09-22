import * as React from "react"

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

interface TooltipProps {
  children: React.ReactNode
}

const Tooltip = ({ children }: TooltipProps) => <>{children}</>

const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>

const TooltipContent = ({ children }: { children: React.ReactNode }) => (
  <div className="z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md">
    {children}
  </div>
)

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }