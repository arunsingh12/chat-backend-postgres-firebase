import { CircleAlert } from 'lucide-react';

export const FormAlert = ({ message }: { message?: string | undefined }) =>
  message ? (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  ) : null;
