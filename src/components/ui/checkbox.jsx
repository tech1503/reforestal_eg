import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

// Simple, dependency-free Checkbox implementation to ensure stability
const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    ref={ref}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      checked && "bg-primary text-primary-foreground",
      className
    )}
    {...props}
  >
    <div className={cn("flex items-center justify-center text-current", checked ? "opacity-100" : "opacity-0")}>
      <Check className="h-4 w-4" />
    </div>
  </button>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }