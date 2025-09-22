import * as React from "react"

interface TabsProps {
  defaultValue?: string
  className?: string
  children: React.ReactNode
}

const Tabs = ({ defaultValue, className, children }: TabsProps) => (
  <div className={className}>{children}</div>
)

const TabsList = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className || ''}`}>
    {children}
  </div>
)

const TabsTrigger = ({ value, children, disabled }: { value: string; children: React.ReactNode; disabled?: boolean }) => (
  <button
    disabled={disabled}
    className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
  >
    {children}
  </button>
)

const TabsContent = ({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) => (
  <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className || ''}`}>
    {children}
  </div>
)

export { Tabs, TabsList, TabsTrigger, TabsContent }