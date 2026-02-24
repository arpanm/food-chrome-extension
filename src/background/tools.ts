/**
 * Tool definitions for Claude (Anthropic tool-use API).
 */

import type { AnthropicToolDefinition } from "../shared/types";

export const AGENT_TOOLS: AnthropicToolDefinition[] = [
  {
    name: "navigate",
    description: "Navigate the Swiggy tab to a URL. Use for going to swiggy.com or order tracking pages.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full URL to open (e.g. https://www.swiggy.com)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "click",
    description: "Click an element on the page. Use a ref from the DOM snapshot (e.g. @e12).",
    input_schema: {
      type: "object",
      properties: {
        ref: {
          type: "string",
          description: "Element ref from snapshot, e.g. @e12",
        },
      },
      required: ["ref"],
    },
  },
  {
    name: "type_text",
    description: "Type text into an input or textarea. Use the ref of the input from the snapshot.",
    input_schema: {
      type: "object",
      properties: {
        ref: { type: "string", description: "Element ref of the input" },
        text: { type: "string", description: "Text to type" },
      },
      required: ["ref", "text"],
    },
  },
  {
    name: "press_key",
    description: "Press a key on an element (e.g. Enter to submit a search box). Use the ref of the focused element, typically the same input you just typed in.",
    input_schema: {
      type: "object",
      properties: {
        ref: { type: "string", description: "Element ref (e.g. the search input)" },
        key: {
          type: "string",
          description: "Key to press: use 'Enter' to submit forms/search",
        },
      },
      required: ["ref", "key"],
    },
  },
  {
    name: "scroll",
    description: "Scroll the page up or down to see more content (e.g. menu items, restaurant list).",
    input_schema: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["up", "down"],
          description: "Scroll direction",
        },
        amount: {
          type: "number",
          description: "Pixels to scroll (default 300)",
        },
      },
      required: ["direction"],
    },
  },
  {
    name: "select_option",
    description: "Select an option in a dropdown (select element). Use ref of the select and value to set.",
    input_schema: {
      type: "object",
      properties: {
        ref: { type: "string", description: "Element ref of the select" },
        value: { type: "string", description: "Option value to select" },
      },
      required: ["ref", "value"],
    },
  },
  {
    name: "wait",
    description: "Wait for a number of seconds (e.g. for page load or animation to finish).",
    input_schema: {
      type: "object",
      properties: {
        seconds: {
          type: "number",
          description: "Seconds to wait (1-10)",
        },
      },
      required: ["seconds"],
    },
  },
  {
    name: "get_page_state",
    description: "Re-capture the current DOM snapshot. Use after navigation or when the page may have changed.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "ask_user",
    description: "Ask the user a question and wait for their answer. When the user must choose from a list, pass 'options' (array of strings) and 'recommended_index' (0-based index of your top pick). The UI shows clickable cards with one marked 'Recommended by AI'. Use for confirmation before adding to cart or placing order.",
    input_schema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "Question to ask the user (e.g. 'Which restaurant?' or 'Proceed to checkout?')",
        },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of choices to show as clickable cards. Each string one option (e.g. '1. Charcoal Eats - Dum Chicken Tikka Biryani, ₹314'). User clicks one; that string is sent as the answer.",
        },
        recommended_index: {
          type: "number",
          description: "0-based index into options for your recommended choice (e.g. best value, best rating). Always set when options are provided so the UI can show 'Recommended by AI'.",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "report_status",
    description: "Send a status update to the chat (e.g. 'Found restaurant X', 'Added item to cart').",
    input_schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Status message to show the user",
        },
      },
      required: ["message"],
    },
  },
];
