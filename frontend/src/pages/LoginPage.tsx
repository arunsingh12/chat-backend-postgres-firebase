import { useMutation } from '@tanstack/react-query';
import { LogIn, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { toFormErrors, type FormErrors } from '@/features/auth/form-errors';
import { useSession } from '@/features/session/session-context';

const FIELDS = ['email', 'password'] as const;
type Field = (typeof FIELDS)[number];

export const LoginPage = () => {
  const { login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors<Field>>({ fields: {} });

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/chats';

  const mutation = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: () => navigate(redirectTo, { replace: true }),
    onError: (error) => setErrors(toFormErrors(error, FIELDS)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({ fields: {} });
    mutation.mutate();
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your conversations."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert message={errors.form} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          icon={<Mail className="size-4" />}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.fields.email}
          required
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.fields.password}
          required
        />
        <Button
          type="submit"
          className="w-full justify-center"
          loading={mutation.isPending}
          disabled={!email.trim() || !password}
        >
          <LogIn className="size-4" /> Log in
        </Button>
      </form>
    </AuthLayout>
  );
};
