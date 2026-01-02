import { spinner } from "@clack/prompts";

type Spinner = ReturnType<typeof spinner>;

/**
 * Create and start a spinner with the given text
 */
export function createSpinner(text: string): Spinner {
  const s = spinner();
  s.start(text);
  return s;
}

/**
 * Update spinner message
 */
export function updateSpinner(s: Spinner, text: string): void {
  s.message(text);
}

/**
 * Stop spinner with success message
 */
export function succeedSpinner(s: Spinner, text: string): void {
  s.stop(text);
}

/**
 * Stop spinner with failure message
 */
export function failSpinner(s: Spinner, text: string): void {
  s.stop(text);
}

/**
 * Stop spinner with warning message
 */
export function warnSpinner(s: Spinner, text: string): void {
  s.stop(text);
}
