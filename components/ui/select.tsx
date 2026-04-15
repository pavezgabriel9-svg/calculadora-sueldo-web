// components/ui/select.tsx

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const SelectContext = React.createContext<{
  value: string
  onChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
} | null>(null)

const Select = ({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode
  value: string
  onValueChange: (value: string) => void
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <SelectContext.Provider
      value={{ value, onChange: onValueChange, isOpen, setIsOpen }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectTrigger must be inside Select")

  return (
    <button
      ref={ref}
      onClick={() => context.setIsOpen(!context.isOpen)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be inside Select")

  return <span className="text-foreground">{context.value || placeholder}</span>
}

const SelectContent = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectContent must be inside Select")

  if (!context.isOpen) return null

  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 z-50 mt-2 rounded-md border border-input bg-background shadow-lg",
        className
      )}
    >
      {children}
    </div>
  )
}

const SelectItem = ({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectItem must be inside Select")

  return (
    <button
      onClick={() => {
        context.onChange(value)
        context.setIsOpen(false)
      }}
      className={cn(
        "block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
        context.value === value && "bg-primary text-primary-foreground"
      )}
    >
      {children}
    </button>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
