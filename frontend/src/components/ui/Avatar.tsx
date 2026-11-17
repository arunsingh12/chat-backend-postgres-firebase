import { Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

const PALETTE = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
];

const hash = (value: string) =>
  [...value].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

const SIZES = {
  xs: 'size-4 text-[8px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
} as const;

interface AvatarProps {
  name: string;
  /** Stable seed for the colour (defaults to the name). */
  seed?: string;
  size?: keyof typeof SIZES;
  group?: boolean;
  className?: string;
  title?: string;
}

export const Avatar = ({ name, seed, size = 'md', group, className, title }: AvatarProps) => (
  <span
    title={title ?? name}
    className={cn(
      'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white',
      PALETTE[hash(seed ?? name) % PALETTE.length],
      SIZES[size],
      className,
    )}
  >
    {group ? (
      <Users className="size-1/2" strokeWidth={2.25} />
    ) : size === 'xs' ? null : (
      initials(name)
    )}
  </span>
);
