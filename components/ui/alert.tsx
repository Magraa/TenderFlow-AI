/**
 * Alert Component
 */
import * as React from "react"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning"
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: "border-blue-200 bg-blue-50 text-blue-900",
      destructive: "border-red-200 bg-red-50 text-red-900",
      success: "border-green-200 bg-green-50 text-green-900",
      warning: "border-yellow-200 bg-yellow-50 text-yellow-900",
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={`relative w-full rounded-lg border px-4 py-3 text-sm ${variantStyles[variant]} ${className}`}
        {...props}
      />
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", ...props }, ref) => (
    <h5 ref={ref} className={`mb-1 font-medium leading-tight ${className}`} {...props} />
  )
)
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`text-sm [&_p]:leading-relaxed ${className}`} {...props} />
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
