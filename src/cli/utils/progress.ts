import yoctoSpinner from "yocto-spinner";

type Spinner = ReturnType<typeof yoctoSpinner>;

/**
 * Create and start a spinner with the given text
 */
export function createSpinner(text: string): Spinner {
  const spinner = yoctoSpinner({ text });
  spinner.start();
  return spinner;
}

/**
 * Update spinner text
 */
export function updateSpinner(spinner: Spinner, text: string): void {
  spinner.text = text;
}

/**
 * Stop spinner with success message
 */
export function succeedSpinner(spinner: Spinner, text: string): void {
  spinner.success(text);
}

/**
 * Stop spinner with failure message
 */
export function failSpinner(spinner: Spinner, text: string): void {
  spinner.error(text);
}

/**
 * Stop spinner with warning message
 */
export function warnSpinner(spinner: Spinner, text: string): void {
  spinner.warning(text);
}
