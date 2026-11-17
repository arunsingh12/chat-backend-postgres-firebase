import { useMutation } from '@tanstack/react-query';
import { Mail, User, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ApiError } from '@/api/http';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { toFormErrors, type FormErrors } from '@/features/auth/form-errors';
import { useSession } from '@/features/session/session-context';

const FIELDS = ['name', 'email', 'password', 'confirmPassword'] as const;
type Field = (typeof FIELDS)[number];
type Values = Record<Field, string>;

/** Mirrors the server rules so most mistakes are caught before a round-trip. */
const validate = (values: Values): FormErrors<Field>['fields'] => {
  const errors: FormErrors<Field>['fields'] = {};
  if (values.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = 'Enter a valid email address';
  if (values.password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
    errors.password = 'Use at least one letter and one number';
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
};

export const RegisterPage = () => {
  const { register } = useSession();
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors<Field>>({ fields: {} });

  const set = (field: Field) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    // Editing a field dismisses its error; the rest stay until the next submit.
    setErrors((current) => ({ ...current, fields: { ...current.fields, [field]: undefined } }));
  };

  const mutation = useMutation({
    mutationFn: () =>
      register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      }),
    onSuccess: (user) => {
      toast.success(`Welcome to Converse, ${user.displayName.split(' ')[0]}!`);
      navigate('/chats', { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setErrors({ fields: { email: error.message } });
      } else {
        setErrors(toFormErrors(error, FIELDS));
      }
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const fieldErrors = validate(values);
    setErrors({ fields: fieldErrors });
    if (Object.keys(fieldErrors).length === 0) mutation.mutate();
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Converse and start chatting with anyone on the site."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert message={errors.form} />
        <Input
          label="Full name"
          autoComplete="name"
          autoFocus
          placeholder="Jane Doe"
          maxLength={80}
          icon={<User className="size-4" />}
          value={values.name}
          onChange={set('name')}
          error={errors.fields.name}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="size-4" />}
          value={values.email}
          onChange={set('email')}
          error={errors.fields.email}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={values.password}
          onChange={set('password')}
          error={errors.fields.password}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={values.confirmPassword}
          onChange={set('confirmPassword')}
          error={errors.fields.confirmPassword}
        />
        <Button type="submit" className="w-full justify-center" loading={mutation.isPending}>
          <UserPlus className="size-4" /> Create account
        </Button>
      </form>
    </AuthLayout>
  );
};
