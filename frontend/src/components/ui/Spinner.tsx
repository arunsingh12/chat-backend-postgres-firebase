import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Spinner = ({ className }: { className?: string }) => (
  <LoaderCircle aria-label="Loading" className={cn('size-5 animate-spin', className)} />
);
