/**
 * Anthropic Claude API client. Supports direct (browser with API key) and proxy (backend) modes.
 */

import type { Config, AnthropicToolDefinition } from "../shared/types";
import { ANTHROPIC_API_URL, DEFAULT_MODEL } from "../shared/constants";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

export interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  >;
  stop_reason: "end_turn" | "tool_use" | "max_tokens";
}

export interface SendMessageOptions {
  config: Config;
  system: string;
  messages: ChatMessage[];
  tools: AnthropicToolDefinition[];
}

export interface SendMessageResult {
  text?: string;
  toolUse?: { id: string; name: string; input: Record<string, unknown> };
  stopReason: string;
}

export async function sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
  const { config, system, messages, tools } = options;
  const model = config.model || DEFAULT_MODEL;
  const body = {
    model,
    max_tokens: 4096,
    system,
    messages,
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    })),
  };

  const url = config.backendUrl?.trim() ? `${config.backendUrl.replace(/\/$/, "")}/api/chat` : ANTHROPIC_API_URL;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!config.backendUrl?.trim()) {
    headers["x-api-key"] = config.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as AnthropicResponse;
  let text: string | undefined;
  let toolUse: SendMessageResult["toolUse"];
  const content = data.content ?? [];

  for (const block of content) {
    if (block.type === "text" && block.text) {
      text = (text ?? "") + block.text;
    }
    if (block.type === "tool_use") {
      toolUse = { id: block.id, name: block.name, input: block.input };
      break;
    }
  }

  return {
    text,
    toolUse,
    stopReason: data.stop_reason ?? "end_turn",
  };
}
