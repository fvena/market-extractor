import { log } from "@clack/prompts";

/**
 * Log a success message
 */
export function success(message: string): void {
  log.success(message);
}

/**
 * Log a warning message
 */
export function warning(message: string): void {
  log.warning(message);
}

/**
 * Log an error message
 */
export function error(message: string): void {
  log.error(message);
}

/**
 * Log an info message
 */
export function info(message: string): void {
  log.info(message);
}

/**
 * Log a plain message
 */
export function dim(message: string): void {
  log.message(message);
}

/**
 * Log an indented success message (for nested items)
 */
export function successIndent(message: string): void {
  log.success(`  ${message}`);
}

/**
 * Log an indented warning message (for nested items)
 */
export function warningIndent(message: string): void {
  log.warning(`  ${message}`);
}

/**
 * Log an indented error message (for nested items)
 */
export function errorIndent(message: string): void {
  log.error(`  ${message}`);
}
