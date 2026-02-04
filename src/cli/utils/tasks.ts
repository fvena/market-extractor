/**
 * A lightweight terminal task runner with spinner animations and progress bars.
 *
 * This module provides a simple API for displaying multiple concurrent tasks in the terminal,
 * each with its own spinner animation, optional progress bar, and completion status.
 * Built on top of `@clack/prompts` for consistent styling.
 *
 * @example Basic usage with sequential tasks
 * ```typescript
 * const tasks = createTasks("Building project");
 *
 * const compile = createTask(tasks, "Compiling TypeScript...");
 * await compileProject();
 * succeedTask(compile, "TypeScript compiled");
 *
 * const lint = createTask(tasks, "Running linter...");
 * await runLinter();
 * succeedTask(lint, "No lint errors");
 *
 * succeedTasks(tasks, "Build completed successfully");
 * ```
 *
 * @example Parallel tasks
 * ```typescript
 * const tasks = createTasks("Deploying services");
 *
 * const api = createTask(tasks, "Deploying API...");
 * const web = createTask(tasks, "Deploying Web...");
 * const worker = createTask(tasks, "Deploying Worker...");
 *
 * await Promise.all([
 *   deployApi().then(() => succeedTask(api, "API deployed")),
 *   deployWeb().then(() => succeedTask(web, "Web deployed")),
 *   deployWorker().then(() => warnTask(worker, "Worker deployed (with warnings)")),
 * ]);
 *
 * succeedTasks(tasks, "All services deployed");
 * ```
 *
 * @example Task with progress bar
 * ```typescript
 * const tasks = createTasks("Downloading files");
 * const download = createTask(tasks, "Preparing...");
 *
 * for (let i = 0; i <= files.length; i++) {
 *   await downloadFile(files[i]);
 *   updateTask(download, "Downloading files", i, files.length);
 * }
 *
 * succeedTask(download, `Downloaded ${files.length} files`);
 * succeedTasks(tasks, "Download complete");
 * ```
 *
 * @packageDocumentation
 */

import * as readline from "node:readline";
import { log } from "@clack/prompts";
import colors from "yoctocolors";

// ============================================
// TYPES
// ============================================

/** Possible states for an individual task */
type TaskStatus = "fail" | "running" | "success" | "warn";

/** Progress information for tasks with a progress bar */
interface ProgressInfo {
  current: number;
  total: number;
}

/**
 * Represents an individual task with its current state.
 *
 * @remarks
 * Tasks are created via {@link createTask} and should not be instantiated directly.
 * The task's visual representation updates automatically based on its properties.
 */
export interface Task {
  /** Current frame index for the spinner animation */
  frameIndex: number;
  /** Optional label for the task */
  label?: string;
  /** Display message for the task */
  message: string;
  /** Optional progress information for displaying a progress bar */
  progress?: ProgressInfo;
  /** Current status of the task */
  status: TaskStatus;
}

/**
 * Container for managing multiple tasks with a shared animation loop.
 *
 * @remarks
 * Created via {@link createTasks}. Manages the animation interval and
 * rendering for all child tasks.
 */
export interface Tasks {
  /** Interval ID for the animation loop, undefined when stopped */
  intervalId: NodeJS.Timeout | undefined;
  /** Array of all tasks in this container */
  tasks: Task[];
  /** Title displayed at the top of the task group */
  title: string;
}

// ============================================
// CONSTANTS
// ============================================

const frames = [" ◒", " ◐", " ◓", " ◑"];
const frameInterval = 80;
const progressBarWidth = 10;
const labelWidth = 18;
const progressTextWidth = 9; // Width of the progress text (e.g. "1000/1100")

const icons: Record<TaskStatus, string> = {
  fail: colors.red(" ✗"),
  running: "", // Uses animated frame
  success: colors.green(" ✓"),
  warn: colors.yellow("⚠ "),
};

// ============================================
// INTERNAL HELPERS
// ============================================

function padString(string_: string, width: number, align: "left" | "right" = "left"): string {
  if (string_.length > width) {
    return string_.slice(0, width - 1) + "…";
  }
  return align === "left" ? string_.padEnd(width) : string_.padStart(width);
}

/**
 * Clears the specified number of lines from the terminal.
 * @param count - Number of lines to clear
 */
function clearLines(count: number): void {
  if (count <= 0) return;

  for (let index = 0; index < count; index++) {
    readline.moveCursor(process.stdout, 0, -1);
    readline.clearLine(process.stdout, 0);
  }
  readline.cursorTo(process.stdout, 0);
}

/**
 * Builds a progress bar string with filled and empty portions.
 * @param current - Current progress value
 * @param total - Total/maximum progress value
 * @returns Formatted progress bar string
 */
function buildProgressBar(current: number, total: number): string {
  const ratio = total > 0 ? current / total : 0;
  const filled = Math.round(ratio * progressBarWidth);
  const empty = progressBarWidth - filled;

  return `${"━".repeat(filled)}${colors.dim("─".repeat(empty))}`;
}

/**
 * Renders a single task line to stdout.
 * @param task - The task to render
 * @param isLast - Whether this is the last task (affects prefix character)
 */
function renderTask(task: Task, isLast: boolean): void {
  const prefix = colors.dim(`│  ${isLast ? "└" : "├"}`);
  const label = task.label ? colors.cyan(padString(task.label, labelWidth)) : "";
  const icon =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- task.frameIndex is guaranteed to be defined
    task.status === "running" ? colors.magenta(frames[task.frameIndex]!) : icons[task.status];
  let progressBar = "";
  let progressText = "";

  // Add progress bar if present
  if (task.progress) {
    const { current, total } = task.progress;
    progressBar = buildProgressBar(current, total);
    progressText = colors.dim(
      padString(`${String(current)}/${String(total)}`, progressTextWidth, "right"),
    );
  }

  const line = [prefix, icon, label, progressBar, progressText, task.message]
    .filter(Boolean)
    .join(" ");
  process.stdout.write(line + "\n");
}

/**
 * Renders all tasks in the container.
 * @param tasks - The tasks container to render
 */
function renderAllTasks(tasks: Tasks): void {
  const allTasks = tasks.tasks;
  const total = tasks.tasks.length;

  for (let index = 0; index < total; index++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- allTasks[index] is guaranteed to be defined
    const task = allTasks[index]!;
    const isLast = index === total - 1;
    renderTask(task, isLast);
  }
}

/**
 * Marks a task as completed with the given status.
 * @param task - The task to complete
 * @param message - Final message to display
 * @param status - Completion status
 */
function completeTask(task: Task, message: string, status: TaskStatus): void {
  task.message = message;
  task.status = status;
  task.progress = undefined;
}

/**
 * Completes the entire task container and displays final message.
 * @param tasks - The tasks container to complete
 * @param message - Final message to display
 * @param status - Log method to use for the final message
 */
function completeTasks(tasks: Tasks, message: string, status: keyof typeof log): void {
  if (tasks.intervalId) {
    clearInterval(tasks.intervalId);
    tasks.intervalId = undefined;
  }

  clearLines(tasks.tasks.length + 2);
  log[status](message);
}

// ============================================
// PUBLIC API - TASKS (container)
// ============================================

/**
 * Creates a new task container with a title.
 *
 * @param title - The title to display at the top of the task group
 * @returns A new Tasks container
 *
 * @remarks
 * The animation loop starts immediately upon creation. The loop automatically
 * stops when no tasks are in the "running" state.
 *
 * @example
 * ```typescript
 * const tasks = createTasks("Installing dependencies");
 * // ... add and complete tasks
 * succeedTasks(tasks, "Dependencies installed");
 * ```
 */
export function createTasks(title: string): Tasks {
  log.step(title);

  const tasks: Tasks = {
    intervalId: undefined,
    tasks: [],
    title,
  };

  tasks.intervalId = setInterval(() => {
    // Auto-stop when no tasks are running
    if (!tasks.tasks.some((task) => task.status === "running")) {
      clearInterval(tasks.intervalId);
      tasks.intervalId = undefined;
      return;
    }

    // Update frame index for all running tasks
    for (const task of tasks.tasks) {
      task.frameIndex = (task.frameIndex + 1) % frames.length;
    }

    clearLines(tasks.tasks.length);
    renderAllTasks(tasks);
  }, frameInterval);

  return tasks;
}

/**
 * Completes the task container with a success status.
 *
 * @param tasks - The tasks container to complete
 * @param message - Success message to display
 *
 * @example
 * ```typescript
 * succeedTasks(tasks, "All operations completed successfully");
 * ```
 */
export function succeedTasks(tasks: Tasks, message: string): void {
  completeTasks(tasks, message, "success");
}

/**
 * Completes the task container with an error status.
 *
 * @param tasks - The tasks container to complete
 * @param message - Error message to display
 *
 * @example
 * ```typescript
 * failTasks(tasks, "Operation failed: unable to connect");
 * ```
 */
export function failTasks(tasks: Tasks, message: string): void {
  completeTasks(tasks, message, "error");
}

/**
 * Completes the task container with a warning status.
 *
 * @param tasks - The tasks container to complete
 * @param message - Warning message to display
 *
 * @example
 * ```typescript
 * warnTasks(tasks, "Completed with warnings");
 * ```
 */
export function warnTasks(tasks: Tasks, message: string): void {
  completeTasks(tasks, message, "warn");
}

// ============================================
// PUBLIC API - TASK (individual)
// ============================================

/**
 * Creates a new task within a container.
 *
 * @param tasks - The parent tasks container
 * @param message - Initial message to display
 * @returns The newly created task
 *
 * @remarks
 * The task starts in the "running" state with an animated spinner.
 * Multiple tasks can run concurrently within the same container.
 *
 * @example
 * ```typescript
 * const task = createTask(tasks, "Processing files...");
 * await processFiles();
 * succeedTask(task, "Files processed");
 * ```
 */
export function createTask(tasks: Tasks, message: string, label?: string): Task {
  clearLines(tasks.tasks.length);

  const task: Task = {
    frameIndex: 0,
    label,
    message,
    status: "running",
  };

  tasks.tasks.push(task);
  renderAllTasks(tasks);

  return task;
}

/**
 * Updates a task's message and optionally adds a progress bar.
 *
 * @param task - The task to update
 * @param message - New message to display
 * @param current - Current progress value (optional, requires total)
 * @param total - Total progress value (optional, requires current)
 *
 * @remarks
 * When both `current` and `total` are provided, a progress bar is displayed.
 * Omitting these parameters removes any existing progress bar.
 *
 * @example Update message only
 * ```typescript
 * updateTask(task, "Still processing...");
 * ```
 *
 * @example Update with progress bar
 * ```typescript
 * updateTask(task, "Downloading", 50, 100);
 * // Displays: ◒ Downloading ██████████░░░░░░░░░░ 50/100
 * ```
 *
 * @example Remove progress bar
 * ```typescript
 * updateTask(task, "Finalizing...");
 * ```
 */
export function updateTask(task: Task, message: string, current?: number, total?: number): void {
  task.message = message;
  task.progress = current !== undefined && total !== undefined ? { current, total } : undefined;
}

/**
 * Marks a task as successfully completed.
 *
 * @param task - The task to complete
 * @param message - Success message to display
 *
 * @example
 * ```typescript
 * succeedTask(task, "Compilation finished (2.3s)");
 * ```
 */
export function succeedTask(task: Task, message: string): void {
  completeTask(task, message, "success");
}

/**
 * Marks a task as failed.
 *
 * @param task - The task to complete
 * @param message - Error message to display
 *
 * @example
 * ```typescript
 * failTask(task, "Connection timeout");
 * ```
 */
export function failTask(task: Task, message: string): void {
  completeTask(task, message, "fail");
}

/**
 * Marks a task as completed with a warning.
 *
 * @param task - The task to complete
 * @param message - Warning message to display
 *
 * @example
 * ```typescript
 * warnTask(task, "Completed with 3 warnings");
 * ```
 */
export function warnTask(task: Task, message: string): void {
  completeTask(task, message, "warn");
}

// ============================================
// PUBLIC API - TASKS LISTING
// ============================================

export function warnSubtask(message: string, isLast: boolean): void {
  const task: Task = {
    frameIndex: 0,
    message,
    status: "warn",
  };
  renderTask(task, isLast);
}

export function failSubtask(message: string, isLast: boolean): void {
  const task: Task = {
    frameIndex: 0,
    message,
    status: "fail",
  };
  renderTask(task, isLast);
}
