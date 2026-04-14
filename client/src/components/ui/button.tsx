import * as React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      outline: "border border-slate-600 bg-transparent hover:bg-slate-800 text-white",
      ghost: "hover:bg-slate-800 text-slate-200",
      secondary: "bg-slate-700 text-white hover:bg-slate-600"
    };
    
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3",
      lg: "h-11 px-8 text-base",
      icon: "h-10 w-10"
    };

    return (
      <button 
        ref={ref}
        className={cn(baseClasses, variants[variant], sizes[size], className)} 
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
