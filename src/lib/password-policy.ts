/**
 * The password rules, stated once so the form and its help text cannot disagree.
 *
 * **These are not the enforcement.** The identity provider enforces the real policy, including the
 * leaked-password check against HaveIBeenPwned, and it is the only thing that can — a rule checked
 * only in a browser is a suggestion. What this buys is the reader finding out before they submit
 * rather than after, and the rules being visible before they start typing rather than appearing as
 * a rejection.
 *
 * Keep in step with Authentication → Sign In / Providers → Email in the Supabase dashboard. Where
 * the two disagree the provider wins, and the reader sees an error this file failed to predict.
 */
export const PASSWORD_RULES = [
  { label: 'At least 12 characters', test: (value: string) => value.length >= 12 },
  { label: 'A lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'An uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'A digit', test: (value: string) => /\d/.test(value) },
  {
    label: 'A symbol',
    test: (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./~`]/.test(value),
  },
] as const

export function unmetRules(password: string): string[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label)
}

export function meetsPolicy(password: string): boolean {
  return unmetRules(password).length === 0
}
