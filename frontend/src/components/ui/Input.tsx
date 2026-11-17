import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  /** Element rendered inside the field on the right (e.g. a show-password toggle). */
  trailing?: ReactNode;
  label?: string;
  error?: string | undefined;
}

export const Input = ({ icon, trailing, label, error, className, id, ...props }: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  const field = (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          {icon}
        </span>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'h-10 w-full rounded-xl border-0 bg-slate-100/80 px-3.5 text-sm text-slate-800 ring-1 ring-inset ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500',
          icon ? 'pl-9' : undefined,
          trailing ? 'pr-10' : undefined,
          error ? 'bg-rose-50/60 ring-rose-300 focus:ring-rose-500' : undefined,
          className,
        )}
        {...props}
      />
      {trailing ? (
        <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>
      ) : null}
    </div>
  );

  const errorText = error ? (
    <p id={errorId} className="text-xs font-medium text-rose-600">
      {error}
    </p>
  ) : null;

  if (!label) {
    return (
      <div className="space-y-1.5">
        {field}
        {errorText}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      {field}
      {errorText}
    </div>
  );
};
