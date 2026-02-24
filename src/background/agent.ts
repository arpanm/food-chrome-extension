/**
 * Agent loop: get DOM snapshot -> Claude -> tool call -> execute -> repeat.
 */

import type {
  ChatMessage as UIMessage,
  Config,
  PageSnapshotResult,
  ActionResult,
} from "../shared/types";
import { MAX_AGENT_ITERATIONS } from "../shared/constants";
import { postToSidepanel } from "../shared/messages";
import type { ChatMessage, AnthropicContentBlock } from "./llm-client";
import { sendMessage } from "./llm-client";
import { AGENT_TOOLS } from "./tools";
import { SYSTEM_PROMPT, buildUserContextBlock } from "./prompts";

const SWIGGY_ORIGIN = "https://www.swiggy.com";

const pendingUserAnswers = new Map<string, (answer: string) => void>();

export function registerUserAnswer(id: string, answer: string): void {
  const resolve = pendingUserAnswers.get(id);
  if (resolve) {
    pendingUserAnswers.delete(id);
    resolve(answer);
  }
}

export function getPendingAskId(): string | null {
  const keys = Array.from(pendingUserAnswers.keys());
  return keys.length > 0 ? keys[0] : null;
}

function notifyAction(tool: string, detail?: string): void {
  postToSidepanel({ type: "AGENT_ACTION", payload: { tool, detail } });
}

function notifyMessage(msg: UIMessage): void {
  postToSidepanel({ type: "AGENT_MESSAGE", payload: msg });
}

function notifyDone(error?: string): void {
  postToSidepanel({ type: "AGENT_DONE", payload: error ? { error } : {} });
}

async function getSnapshot(tabId: number): Promise<PageSnapshotResult | null> {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: "GET_SNAPSHOT" });
    if (res?.type === "PAGE_SNAPSHOT" && res.payload) return res.payload as PageSnapshotResult;
  } catch {
    return null;
  }
  return null;
}

async function executeAction(
  tabId: number,
  name: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; snapshot?: PageSnapshotResult; error?: string; userAnswer?: string }> {
  try {
    if (name === "navigate") {
      const url = input.url as string;
      if (!url) return { success: false, error: "Missing url" };
      await chrome.tabs.update(tabId, { url });
      notifyAction("navigate", url);
      await new Promise((r) => setTimeout(r, 3000));
      const snap = await getSnapshot(tabId);
      return { success: true, snapshot: snap ?? undefined };
    }

    if (name === "click") {
      const ref = input.ref as string;
      if (!ref) return { success: false, error: "Missing ref" };
      notifyAction("click", ref);
      const res = (await chrome.tabs.sendMessage(tabId, {
        type: "EXECUTE_ACTION",
        payload: { action: "click", ref },
      })) as { type: string; payload: ActionResult };
      if (res?.type === "ACTION_RESULT") {
        const p = res.payload;
        return { success: p.success, snapshot: p.snapshot, error: p.error };
      }
    }

    if (name === "type_text") {
      const ref = input.ref as string;
      const text = input.text as string;
      if (!ref || text === undefined) return { success: false, error: "Missing ref or text" };
      notifyAction("type_text", ref);
      const res = (await chrome.tabs.sendMessage(tabId, {
        type: "EXECUTE_ACTION",
        payload: { action: "type_text", ref, text },
      })) as { type: string; payload: ActionResult };
      if (res?.type === "ACTION_RESULT") {
        const p = res.payload;
        return { success: p.success, snapshot: p.snapshot, error: p.error };
      }
    }

    if (name === "press_key") {
      const ref = input.ref as string;
      const key = (input.key as string) ?? "Enter";
      if (!ref) return { success: false, error: "Missing ref" };
      notifyAction("press_key", key);
      const res = (await chrome.tabs.sendMessage(tabId, {
        type: "EXECUTE_ACTION",
        payload: { action: "press_key", ref, key },
      })) as { type: string; payload: ActionResult };
      if (res?.type === "ACTION_RESULT") {
        const p = res.payload;
        return { success: p.success, snapshot: p.snapshot, error: p.error };
      }
    }

    if (name === "scroll") {
      const direction = (input.direction as "up" | "down") ?? "down";
      const amount = input.amount as number | undefined;
      notifyAction("scroll", direction);
      const res = (await chrome.tabs.sendMessage(tabId, {
        type: "EXECUTE_ACTION",
        payload: { action: "scroll", direction, amount },
      })) as { type: string; payload: ActionResult };
      if (res?.type === "ACTION_RESULT") {
        const p = res.payload;
        return { success: p.success, snapshot: p.snapshot, error: p.error };
      }
    }

    if (name === "select_option") {
      const ref = input.ref as string;
      const value = input.value as string;
      if (!ref || value === undefined) return { success: false, error: "Missing ref or value" };
      notifyAction("select_option", ref);
      const res = (await chrome.tabs.sendMessage(tabId, {
        type: "EXECUTE_ACTION",
        payload: { action: "select_option", ref, value },
      })) as { type: string; payload: ActionResult };
      if (res?.type === "ACTION_RESULT") {
        const p = res.payload;
        return { success: p.success, snapshot: p.snapshot, error: p.error };
      }
    }

    if (name === "wait") {
      const seconds = (input.seconds as number) ?? 2;
      notifyAction("wait", `${seconds}s`);
      const res = (await chrome.tabs.sendMessage(tabId, {
        type: "EXECUTE_ACTION",
        payload: { action: "wait", seconds },
      })) as { type: string; payload: ActionResult };
      if (res?.type === "ACTION_RESULT") {
        const p = res.payload;
        return { success: p.success, snapshot: p.snapshot, error: p.error };
      }
    }

    if (name === "get_page_state") {
      notifyAction("get_page_state");
      const snap = await getSnapshot(tabId);
      return { success: true, snapshot: snap ?? undefined };
    }

    if (name === "ask_user") {
      const question = input.question as string;
      if (!question) return { success: false, error: "Missing question" };
      const options = input.options as string[] | undefined;
      const recommendedIndex = input.recommended_index as number | undefined;
      const id = `ask-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return new Promise<{ success: true; userAnswer: string }>((resolve) => {
        pendingUserAnswers.set(id, (answer: string) => {
          resolve({ success: true, userAnswer: answer });
        });
        postToSidepanel({
          type: "ASK_USER",
          payload: { question, id, options, recommendedIndex },
        });
      }).then((r) => ({ success: true, userAnswer: r.userAnswer }));
    }

      if (name === "report_status") {
      const message = input.message as string;
      if (message) {
        notifyMessage({
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: message,
          timestamp: Date.now(),
        });
      }
      return { success: true };
    }

    return { success: false, error: `Unknown tool: ${name}` };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { success: false, error: err };
  }
}


const MAX_SNAPSHOT_CHARS_IN_RESULT = 12000;

function buildToolResultContent(
  toolUseId: string,
  result: {
    success: boolean;
    error?: string;
    userAnswer?: string;
    snapshot?: PageSnapshotResult;
  }
): AnthropicContentBlock[] {
  let content: string;
  if ("userAnswer" in result && result.userAnswer !== undefined) {
    content = `User replied: ${result.userAnswer}`;
  } else if (result.success) {
    content = "Action completed successfully.";
    if (result.snapshot?.snapshot) {
      const snap = result.snapshot.snapshot.length > MAX_SNAPSHOT_CHARS_IN_RESULT
        ? result.snapshot.snapshot.slice(0, MAX_SNAPSHOT_CHARS_IN_RESULT) + "\n... (truncated)"
        : result.snapshot.snapshot;
      content += `\n\nUpdated page snapshot:\n\`\`\`\n${snap}\n\`\`\``;
    }
  } else {
    content = `Error: ${result.error ?? "Unknown error"}`;
  }
  return [
    {
      type: "tool_result",
      tool_use_id: toolUseId,
      content,
      is_error: !result.success,
    },
  ];
}

let abortRequested = false;

export function abortAgent(): void {
  abortRequested = true;
}

const INITIAL_SNAPSHOT_RETRIES = 6;
const INITIAL_SNAPSHOT_RETRY_DELAY_MS = 2000;
const INJECT_RETRY_AFTER_ATTEMPTS = 3;

async function getSnapshotWithRetry(tabId: number): Promise<PageSnapshotResult | null> {
  for (let i = 0; i < INITIAL_SNAPSHOT_RETRIES; i++) {
    const snapshot = await getSnapshot(tabId);
    if (snapshot) return snapshot;

    if (i === INJECT_RETRY_AFTER_ATTEMPTS - 1) {
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
        await new Promise((r) => setTimeout(r, 2500));
      } catch {
        // Ignore injection errors; continue retrying
      }
    }

    if (i < INITIAL_SNAPSHOT_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, INITIAL_SNAPSHOT_RETRY_DELAY_MS));
    }
  }
  return null;
}

export async function runAgent(
  config: Config,
  tabId: number,
  userText: string,
  onDone: () => void
): Promise<void> {
  abortRequested = false;
  let snapshot: PageSnapshotResult | null = await getSnapshotWithRetry(tabId);
  if (!snapshot) {
    notifyMessage({
      id: "err-1",
      role: "assistant",
      content: "Could not read the page. The Swiggy tab may still be loading—please wait a moment and try your message again, or refresh the Swiggy tab.",
      timestamp: Date.now(),
    });
    notifyDone("No snapshot");
    onDone();
    return;
  }

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: buildUserContextBlock(snapshot.snapshot, userText),
    },
  ];

  let iterations = 0;

  while (iterations < MAX_AGENT_ITERATIONS && !abortRequested) {
    iterations += 1;

    const result = await sendMessage({
      config,
      system: SYSTEM_PROMPT,
      messages,
      tools: AGENT_TOOLS,
    }).catch((err) => {
      notifyMessage({
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `Error calling API: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      });
      return null;
    });

    if (result == null) {
      notifyDone("API error");
      onDone();
      return;
    }

    if (result.text?.trim()) {
      notifyMessage({
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: result.text.trim(),
        timestamp: Date.now(),
      });
    }

    if (result.stopReason === "end_turn" || !result.toolUse) {
      notifyDone();
      onDone();
      return;
    }

    const { id: toolUseId, name, input } = result.toolUse;
    const actionResult = await executeAction(tabId, name, input);

    messages.push({
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: toolUseId,
          name,
          input,
        },
      ],
    });
    messages.push({
      role: "user",
      content: buildToolResultContent(toolUseId, actionResult),
    });
  }

  if (abortRequested) {
    notifyMessage({
      id: "abort",
      role: "assistant",
      content: "Stopped by user.",
      timestamp: Date.now(),
    });
  } else if (iterations >= MAX_AGENT_ITERATIONS) {
    notifyMessage({
      id: "max",
      role: "assistant",
      content: "Reached maximum steps. You can try again with a simpler request.",
      timestamp: Date.now(),
    });
  }

  notifyDone();
  onDone();
}

export async function getSwiggyTabId(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ url: `${SWIGGY_ORIGIN}/*` });
  const active = tabs.find((t) => t.active) ?? tabs[0];
  return active?.id ?? null;
}

/**
 * Returns a Swiggy tab id. If no Swiggy tab exists, opens Swiggy in a new tab and waits for load.
 */
export async function getOrCreateSwiggyTab(): Promise<number | null> {
  const existing = await getSwiggyTabId();
  if (existing != null) return existing;

  const tab = await chrome.tabs.create({ url: SWIGGY_ORIGIN, active: true });
  if (tab.id == null) return null;

  const tabId = tab.id;
  return new Promise<number | null>((resolve) => {
    let settled = false;
    const done = (id: number | null) => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(id);
    };
    const listener = (id: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        settled = true;
        // Content script injects at document_idle; wait so it's ready before we request snapshot
        setTimeout(() => resolve(tabId), 4500);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => done(tabId), 20000);
  });
}
