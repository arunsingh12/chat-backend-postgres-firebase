import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export const AuthLayout = ({ title, subtitle, children, footer }: AuthLayoutProps) => (
  <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
    <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-200/60 to-violet-200/50 blur-3xl" />

    <div className="relative w-full max-w-sm animate-pop-in">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200/60">
        {children}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
    </div>
  </div>
);
