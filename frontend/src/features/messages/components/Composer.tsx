import { Pencil, SendHorizontal, X } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import type { Message } from '@/api/types';
import { cn } from '@/lib/cn';

const MAX_LENGTH = 4000;
const MAX_HEIGHT = 160;

interface ComposerProps {
  editing: Message | null;
  onSend: (text: string) => void;
  onSaveEdit: (message: Message, text: string) => void;
  onCancelEdit: () => void;
  disabled?: boolean;
}

/**
 * Remount with `key={editing?.id}` to switch between composing and editing;
 * the draft is then seeded from the message being edited.
 */
export const Composer = ({
  editing,
  onSend,
  onSaveEdit,
  onCancelEdit,
  disabled,
}: ComposerProps) => {
  const [text, setText] = useState(() => editing?.text ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // Auto-grow up to MAX_HEIGHT, then scroll.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text]);

  const trimmed = text.trim();
  const unchanged = editing !== null && trimmed === editing.text;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!trimmed || unchanged || disabled) return;
    if (editing) onSaveEdit(editing, trimmed);
    else onSend(trimmed);
    setText('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape' && editing) {
      onCancelEdit();
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-slate-200/70 bg-white px-4 py-3 sm:px-8">
      <div className="mx-auto max-w-3xl">
        {editing ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm">
            <Pencil className="size-4 shrink-0 text-brand-600" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-brand-700">Editing message</p>
              <p className="truncate text-slate-600">{editing.text}</p>
            </div>
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-600"
              aria-label="Cancel editing"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2 rounded-2xl bg-slate-100/80 p-1.5 pl-4 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            maxLength={MAX_LENGTH}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…"
            aria-label="Message"
            className="scrollbar-thin max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[14.5px] leading-5 text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!trimmed || unchanged || disabled}
            aria-label={editing ? 'Save edit' : 'Send message'}
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl transition',
              trimmed && !unchanged
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 hover:bg-brand-700'
                : 'bg-slate-200 text-slate-400',
            )}
          >
            <SendHorizontal className="size-[18px]" />
          </button>
        </div>
        <p className="mt-1.5 hidden text-[11px] text-slate-400 sm:block">
          <kbd className="font-sans font-medium">Enter</kbd> to send ·{' '}
          <kbd className="font-sans font-medium">Shift + Enter</kbd> for a new line
        </p>
      </div>
    </form>
  );
};
