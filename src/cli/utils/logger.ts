import colors from "yoctocolors";

/**
 * Log a success message with green checkmark
 */
export function success(message: string): void {
  console.log(`${colors.green("✓")} ${message}`);
}

/**
 * Log a warning message with yellow warning sign
 */
export function warning(message: string): void {
  console.log(`${colors.yellow("⚠")} ${message}`);
}

/**
 * Log an error message with red X
 */
export function error(message: string): void {
  console.log(`${colors.red("✗")} ${message}`);
}

/**
 * Log an info message with blue info sign
 */
export function info(message: string): void {
  console.log(`${colors.blue("ℹ")} ${message}`);
}

/**
 * Log a dimmed message
 */
export function dim(message: string): void {
  console.log(colors.dim(message));
}

/**
 * Log an indented success message (for nested items)
 */
export function successIndent(message: string): void {
  console.log(`  ${colors.green("✓")} ${message}`);
}

/**
 * Log an indented warning message (for nested items)
 */
export function warningIndent(message: string): void {
  console.log(`  ${colors.yellow("⚠")} ${message}`);
}

/**
 * Log an indented error message (for nested items)
 */
export function errorIndent(message: string): void {
  console.log(`  ${colors.red("✗")} ${message}`);
}
