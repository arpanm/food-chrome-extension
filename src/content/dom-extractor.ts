/**
 * Converts the page DOM into a compact, accessibility-tree style text representation
 * with stable refs (@e1, @e2, ...) for LLM tool calls. Injects data-agent-ref on elements
 * so actions can find them later.
 */

import type { PageSnapshotResult } from "../shared/types";
import { DEFAULT_DOM_MAX_TOKENS } from "../shared/constants";

const DATA_REF_ATTR = "data-agent-ref";
const APPROX_CHARS_PER_TOKEN = 4;

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "PATH",
  "DEFS",
  "CLIPPATH",
]);

const INTERACTIVE_TAGS = new Set([
  "A",
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "SUMMARY",
]);

function isHidden(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")
    return true;
  const rect = el.getBoundingClientRect();
  return rect.width === 0 || rect.height === 0;
}

function isInteractive(el: Element): boolean {
  const tag = el.tagName;
  if (INTERACTIVE_TAGS.has(tag)) return true;
  const role = el.getAttribute("role");
  if (role && ["button", "link", "tab", "option", "checkbox", "radio", "menuitem"].includes(role))
    return true;
  if (el.hasAttribute("onclick") || el.getAttribute("tabindex") === "0") return true;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "A" || tag === "BUTTON")
    return true;
  return false;
}

function getRoleOrTag(el: Element): string {
  const role = el.getAttribute("role");
  if (role) return role;
  const tag = el.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "input") {
    const type = (el as HTMLInputElement).type || "text";
    return `input type=${type}`;
  }
  if (tag === "select") return "select";
  if (tag === "textarea") return "textarea";
  if (tag === "button") return "button";
  if (tag === "img") return "img";
  if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) return "heading";
  return tag;
}

function getVisibleText(el: Element, maxLen: number): string {
  let text = "";
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node.textContent || "").trim();
    }
  }
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > maxLen) text = text.slice(0, maxLen) + "...";
  return text;
}

function getAttributes(el: Element): string[] {
  const parts: string[] = [];
  const placeholder = el.getAttribute("placeholder");
  if (placeholder) parts.push(`placeholder="${placeholder}"`);
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) parts.push(`aria-label="${ariaLabel}"`);
  const href = el.getAttribute("href");
  if (href && el.tagName === "A") parts.push(`href="${href.slice(0, 80)}"`);
  const type = (el as HTMLInputElement).type;
  if (type && el.tagName === "INPUT") parts.push(`type=${type}`);
  const dataTestId = el.getAttribute("data-testid");
  if (dataTestId) parts.push(`data-testid="${dataTestId}"`);
  return parts;
}

interface NodeInfo {
  ref: string;
  depth: number;
  role: string;
  text: string;
  attrs: string[];
  isInteractive: boolean;
}

function clearOldRefs(root: Element): void {
  root.querySelectorAll(`[${DATA_REF_ATTR}]`).forEach((el) => el.removeAttribute(DATA_REF_ATTR));
}

function findVisibleModal(): Element | null {
  const candidates = document.querySelectorAll(
    '[role="dialog"], [aria-modal="true"], [data-testid*="modal"], [class*="modal"][class*="open"], [class*="Modal"]'
  );
  for (const el of candidates) {
    if (!isHidden(el)) return el;
  }
  return null;
}

function walk(
  root: Element,
  depth: number,
  state: { refCounter: number; refMap: Record<string, string>; outputChars: number; outputLines: string[] },
  maxChars: number,
  skipDescendantsOf?: Element | null
): void {
  if (state.outputChars >= maxChars) return;
  if (skipDescendantsOf && root !== skipDescendantsOf && skipDescendantsOf.contains(root)) return;

  if (SKIP_TAGS.has(root.tagName)) return;
  if (root.closest("svg")) return;
  if (isHidden(root)) return;

  const isInteract = isInteractive(root);
  const role = getRoleOrTag(root);
  const text = getVisibleText(root, 100);
  const attrs = getAttributes(root);

  const hasRelevantContent =
    isInteract ||
    text.length > 0 ||
    attrs.length > 0 ||
    ["section", "header", "nav", "main", "article", "heading", "img"].includes(role) ||
    root.tagName === "SECTION" ||
    root.tagName === "HEADER" ||
    root.tagName === "NAV" ||
    root.tagName === "MAIN" ||
    root.tagName === "H1" ||
    root.tagName === "H2" ||
    root.tagName === "H3" ||
    root.tagName === "H4" ||
    root.tagName === "H5" ||
    root.tagName === "H6";

  if (hasRelevantContent) {
    state.refCounter += 1;
    const refId = `e${state.refCounter}`;
    const ref = `@${refId}`;
    root.setAttribute(DATA_REF_ATTR, refId);
    state.refMap[ref] = refId;

    const indent = "  ".repeat(depth);
    const attrStr = attrs.length ? " " + attrs.join(" ") : "";
    const textStr = text ? ` "${text}"` : "";
    const line = `${indent}${ref} [${role}]${attrStr}${textStr}`;
    state.outputLines.push(line);
    state.outputChars += line.length + 1;
  }

  if (state.outputChars >= maxChars) return;

  const children = Array.from(root.children);
  for (const child of children) {
    walk(child, depth + 1, state, maxChars, skipDescendantsOf);
    if (state.outputChars >= maxChars) break;
  }
}

export function extractPageSnapshot(maxTokens?: number): PageSnapshotResult {
  const maxChars = (maxTokens ?? DEFAULT_DOM_MAX_TOKENS) * APPROX_CHARS_PER_TOKEN;
  const state = {
    refCounter: 0,
    refMap: {} as Record<string, string>,
    outputChars: 0,
    outputLines: [] as string[],
  };

  clearOldRefs(document.body);
  const title = document.title || "Untitled";
  state.outputLines.push(`[page] ${title}`);
  state.outputChars += state.outputLines[0].length + 1;

  const modalRoot = findVisibleModal();
  if (modalRoot) {
    state.outputLines.push("");
    state.outputLines.push("[modal - addons/customization - handle this first]");
    state.outputChars += state.outputLines[state.outputLines.length - 1].length + 2;
    walk(modalRoot, 0, state, maxChars);
    state.outputLines.push("");
    state.outputLines.push("[main page]");
    state.outputChars += state.outputLines[state.outputLines.length - 1].length + 2;
  }

  walk(document.body, 0, state, maxChars, modalRoot);

  const snapshot = state.outputLines.join("\n");

  return {
    url: window.location.href,
    title,
    snapshot,
    refMap: { ...state.refMap },
  };
}

export function getElementByRef(ref: string): Element | null {
  const refId = ref.startsWith("@") ? ref.slice(1) : ref;
  return document.querySelector(`[${DATA_REF_ATTR}="${refId}"]`);
}
