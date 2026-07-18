/**
 * Textarea Component
 */
import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => (
    <textarea
      className={`flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50`
        .split(' ')
        .filter(cls => {
          // If caller provides a bg-* class, remove our default bg-white
          if (cls === 'bg-white' && className && /\bbg-/.test(className)) return false;
          // If caller provides a text-* class, remove our default text-sm
          if (cls === 'text-sm' && className && /\btext-(xs|sm|base|lg|xl)\b/.test(className)) return false;
          return true;
        })
        .join(' ') + ' ' + className}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
