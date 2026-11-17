import { ApiError } from '@/api/http';

export interface FormErrors<Field extends string> {
  fields: Partial<Record<Field, string>>;
  /** Error not tied to a single field (wrong credentials, network, …). */
  form?: string;
}

/** Maps an API error onto form fields so messages show next to the right input. */
export const toFormErrors = <Field extends string>(
  error: unknown,
  fields: readonly Field[],
): FormErrors<Field> => {
  if (!(error instanceof ApiError)) {
    return { fields: {}, form: 'Something went wrong. Please try again.' };
  }

  const byField = error.fieldErrors;
  const mapped = Object.fromEntries(
    fields.filter((field) => byField[field]).map((field) => [field, byField[field]]),
  ) as Partial<Record<Field, string>>;

  if (Object.keys(mapped).length > 0) return { fields: mapped };
  return { fields: {}, form: error.message };
};
