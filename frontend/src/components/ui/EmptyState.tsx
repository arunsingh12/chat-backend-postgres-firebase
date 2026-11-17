import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center px-6 text-center', className)}>
    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    {description ? <p className="mt-1 max-w-xs text-sm text-slate-500">{description}</p> : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
