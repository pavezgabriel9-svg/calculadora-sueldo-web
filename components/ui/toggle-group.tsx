// components/ui/toggle-group.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

const ToggleGroupContext = React.createContext<{
  value: string
  onChange: (value: string) => void
  type: "single" | "multiple"
} | null>(null)

const ToggleGroup = ({
  children,
  value,
  onValueChange,
  type = "single",
  className,
}: {
  children: React.ReactNode
  value: string
  onValueChange: (value: string) => void
  type?: "single" | "multiple"
  className?: string
}) => {
  return (
    <ToggleGroupContext.Provider
      value={{ value, onChange: onValueChange, type }}
    >
      <div className={cn("flex gap-2", className)}>{children}</div>
    </ToggleGroupContext.Provider>
  )
}

const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
  }
>(({ value, className, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)
  if (!context) throw new Error("ToggleGroupItem must be inside ToggleGroup")

  const isSelected = context.value === value

  return (
    <button
      ref={ref}
      onClick={() => context.onChange(value)}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected && "bg-accent text-accent-foreground",
        className
      )}
      data-state={isSelected ? "on" : "off"}
      {...props}
    >
      {props.children}
    </button>
  )
})
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
