import { MessageCircle } from 'lucide-react';

export const Logo = () => (
  <div className="flex items-center gap-2.5">
    <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-md shadow-brand-500/25">
      <MessageCircle className="size-5" strokeWidth={2.25} />
    </span>
    <span className="text-lg font-bold tracking-tight text-slate-900">Converse</span>
  </div>
);
