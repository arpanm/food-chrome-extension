/**
 * Execute browser actions by ref (from DOM snapshot).
 */

import { getElementByRef, extractPageSnapshot } from "./dom-extractor";
import type { ActionResult, PageSnapshotResult } from "../shared/types";

export async function executeClick(ref: string): Promise<ActionResult> {
  const el = getElementByRef(ref);
  if (!el) return { success: false, error: `Element not found: ${ref}` };
  (el as HTMLElement).click();
  await sleep(700);
  const snapshot = extractPageSnapshot();
  return { success: true, snapshot };
}

export async function executeTypeText(ref: string, text: string): Promise<ActionResult> {
  const el = getElementByRef(ref);
  if (!el) return { success: false, error: `Element not found: ${ref}` };
  const htmlEl = el as HTMLInputElement | HTMLTextAreaElement;
  if (htmlEl.tagName !== "INPUT" && htmlEl.tagName !== "TEXTAREA") {
    return { success: false, error: `Element is not an input: ${ref}` };
  }
  htmlEl.focus();
  htmlEl.value = text;
  htmlEl.dispatchEvent(new Event("input", { bubbles: true }));
  htmlEl.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(600);
  const snapshot = extractPageSnapshot();
  return { success: true, snapshot };
}

export async function executePressKey(ref: string, key: string): Promise<ActionResult> {
  const el = getElementByRef(ref);
  if (!el) return { success: false, error: `Element not found: ${ref}` };
  const htmlEl = el as HTMLElement;
  htmlEl.focus();
  const keyCode = key === "Enter" ? 13 : key.charCodeAt?.(0) ?? 13;
  const keyEventOpts: KeyboardEventInit = {
    key,
    code: key === "Enter" ? "Enter" : `Key${key.toUpperCase()}`,
    keyCode,
    which: keyCode,
    bubbles: true,
  };
  htmlEl.dispatchEvent(new KeyboardEvent("keydown", keyEventOpts));
  htmlEl.dispatchEvent(new KeyboardEvent("keypress", keyEventOpts));
  htmlEl.dispatchEvent(new KeyboardEvent("keyup", keyEventOpts));
  await sleep(800);
  const snapshot = extractPageSnapshot();
  return { success: true, snapshot };
}

export async function executeScroll(direction: "up" | "down", amount: number = 300): Promise<ActionResult> {
  const delta = amount;
  const y = direction === "down" ? delta : -delta;
  window.scrollBy({ top: y, behavior: "smooth" });
  await sleep(500);
  const snapshot = extractPageSnapshot();
  return { success: true, snapshot };
}

export async function executeSelectOption(ref: string, value: string): Promise<ActionResult> {
  const el = getElementByRef(ref);
  if (!el) return { success: false, error: `Element not found: ${ref}` };
  const select = el as HTMLSelectElement;
  if (select.tagName !== "SELECT") {
    return { success: false, error: `Element is not a select: ${ref}` };
  }
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(300);
  const snapshot = extractPageSnapshot();
  return { success: true, snapshot };
}

export async function executeWait(seconds: number): Promise<ActionResult> {
  await sleep(seconds * 1000);
  const snapshot = extractPageSnapshot();
  return { success: true, snapshot };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getSnapshot(): PageSnapshotResult {
  return extractPageSnapshot();
}
