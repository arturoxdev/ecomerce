export type FormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};
