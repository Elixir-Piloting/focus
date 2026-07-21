import { type InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full border-0 outline-none bg-input rounded-lg px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:bg-surface focus:ring-2 focus:ring-accent shadow-inset-sm ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
