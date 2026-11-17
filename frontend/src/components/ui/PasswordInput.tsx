import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { Input } from './Input';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'trailing' | 'icon'>;

export const PasswordInput = (props: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      icon={<Lock className="size-4" />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
};
