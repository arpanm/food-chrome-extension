/**
 * Shared types for Chrome extension message passing, agent tools, and chat state.
 */

// ---- Chrome message types ----

export type MessageSource = "sidepanel" | "background" | "content";

export type FromSidepanel =
  | { type: "SEND_MESSAGE"; payload: { text: string } }
  | { type: "STOP_AGENT" }
  | { type: "GET_CONFIG" }
  | { type: "SAVE_CONFIG"; payload: Config }
  | { type: "GET_TAB_ID" }
  | { type: "USER_ANSWER"; payload: { id: string; answer: string } };

export type FromBackground =
  | { type: "CONFIG"; payload: Config }
  | { type: "AGENT_MESSAGE"; payload: ChatMessage }
  | { type: "AGENT_ACTION"; payload: { tool: string; detail?: string } }
  | { type: "AGENT_DONE"; payload?: { error?: string } }
  | { type: "TAB_ID"; payload: number | null }
  | { type: "ASK_USER"; payload: { question: string; id: string; options?: string[]; recommendedIndex?: number } }
  | { type: "USER_ANSWER"; payload: { id: string; answer: string } };

export type FromContent =
  | { type: "PAGE_SNAPSHOT"; payload: PageSnapshotResult }
  | { type: "ACTION_RESULT"; payload: ActionResult };

// ---- Content script request/response ----

export type ContentRequest =
  | { type: "GET_SNAPSHOT"; payload?: { maxTokens?: number } }
  | {
      type: "EXECUTE_ACTION";
      payload:
        | { action: "click"; ref: string }
        | { action: "type_text"; ref: string; text: string }
        | { action: "press_key"; ref: string; key: string }
        | { action: "scroll"; direction: "up" | "down"; amount?: number }
        | { action: "select_option"; ref: string; value: string }
        | { action: "wait"; seconds: number }
        | { action: "navigate"; url: string };
    };

export interface PageSnapshotResult {
  url: string;
  title: string;
  snapshot: string;
  refMap: Record<string, string>; // ref -> selector or xpath for execution
}

export interface ActionResult {
  success: boolean;
  error?: string;
  snapshot?: PageSnapshotResult; // optional updated snapshot after action
}

// ---- Chat UI state ----

export type MessageRole = "user" | "assistant" | "action";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

// ---- Config ----

export interface Config {
  apiKey: string;
  backendUrl: string; // empty = direct mode
  model: string;
}

// ---- LLM / Anthropic API types ----

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    };

export interface AnthropicToolProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: { type: string };
}

export interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, AnthropicToolProperty>;
    required?: string[];
  };
}

export interface AgentTurnResult {
  text?: string;
  toolUse?: { id: string; name: string; input: Record<string, unknown> };
  stopReason: "end_turn" | "tool_use" | "max_tokens";
}
