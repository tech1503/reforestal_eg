import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

// Simple, dependency-free Radio Group implementation to ensure stability
const RadioGroup = React.forwardRef(({ className, value, onValueChange, children, ...props }, ref) => {
  return (
    <div 
      ref={ref} 
      className={cn("grid gap-2", className)} 
      {...props}
      role="radiogroup"
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            checked: child.props.value === value,
            onCheck: () => onValueChange(child.props.value)
          });
        }
        return child;
      })}
    </div>
  )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef(({ className, value, checked, onCheck, ...props }, ref) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      ref={ref}
      onClick={onCheck}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <div className={cn("flex items-center justify-center", checked ? "opacity-100" : "opacity-0")}>
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </div>
    </button>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }