// components/ui/radio-group.tsx

import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
  value: string
  onChange: (value: string) => void
} | null>(null)

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
    onValueChange: (value: string) => void
  }
>(({ className, value, onValueChange, ...props }, ref) => (
  <RadioGroupContext.Provider value={{ value, onChange: onValueChange }}>
    <div
      ref={ref}
      className={cn("flex items-center gap-4", className)}
      {...props}
    />
  </RadioGroupContext.Provider>
))
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    value: string
  }
>(({ className, value, ...props }, ref) => {
  const context = React.useContext(RadioGroupContext)
  if (!context) throw new Error("RadioGroupItem must be used inside RadioGroup")

  return (
    <div className="relative flex items-center">
      <input
        type="radio"
        ref={ref}
        value={value}
        checked={context.value === value}
        onChange={(e) => context.onChange(e.target.value)}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer appearance-none bg-background checked:border-primary",
          className
        )}
        {...props}
      />
      <Circle className="pointer-events-none absolute left-1 top-1 h-2 w-2 fill-primary text-primary opacity-0 peer-checked:opacity-100" />
    </div>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
