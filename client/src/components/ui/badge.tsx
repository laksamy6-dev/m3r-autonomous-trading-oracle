import * as React from "react";
import { cn } from "../../lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: "border-transparent bg-blue-600 text-white hover:bg-blue-700",
      destructive: "border-transparent bg-red-600 text-white hover:bg-red-700",
      outline: "border-slate-600 text-slate-200 hover:bg-slate-800",
      secondary: "border-transparent bg-slate-700 text-slate-200 hover:bg-slate-600"
    };

    return (
      <div 
        ref={ref} 
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Badge.displayName = "Badge";
