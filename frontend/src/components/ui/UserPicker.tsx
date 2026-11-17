import { Check, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { User } from '@/api/types';
import { cn } from '@/lib/cn';
import { Avatar } from './Avatar';
import { Input } from './Input';

interface UserPickerProps {
  users: User[];
  selected: ReadonlySet<string>;
  onToggle: (userId: string) => void;
  multiple?: boolean;
  emptyLabel?: string;
}

/** Searchable list of users, used by "new chat", "new group" and "add members". */
export const UserPicker = ({
  users,
  selected,
  onToggle,
  multiple,
  emptyLabel = 'No people found',
}: UserPickerProps) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(needle) ||
        user.email?.toLowerCase().includes(needle),
    );
  }, [users, query]);

  return (
    <div className="space-y-3">
      <Input
        autoFocus
        placeholder="Search people"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        icon={<Search className="size-4" />}
      />
      <ul className="-mx-2 space-y-0.5">
        {filtered.map((user) => {
          const isSelected = selected.has(user.id);
          return (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => onToggle(user.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition',
                  isSelected ? 'bg-brand-50' : 'hover:bg-slate-50',
                )}
              >
                <Avatar name={user.displayName} seed={user.id} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {user.displayName}
                  </span>
                  {user.email ? (
                    <span className="block truncate text-xs text-slate-500">{user.email}</span>
                  ) : null}
                </span>
                {multiple ? (
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-md border transition',
                      isSelected
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 bg-white',
                    )}
                  >
                    {isSelected ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="px-2 py-6 text-center text-sm text-slate-500">{emptyLabel}</li>
        ) : null}
      </ul>
    </div>
  );
};
