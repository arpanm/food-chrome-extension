/**
 * Content script: message listener, DOM snapshot, and action execution on Swiggy pages.
 */

import type { ContentRequest, FromContent } from "../shared/types";
import { extractPageSnapshot } from "./dom-extractor";
import {
  executeClick,
  executeTypeText,
  executePressKey,
  executeScroll,
  executeSelectOption,
  executeWait,
} from "./actions";

chrome.runtime.onMessage.addListener(
  (
    message: ContentRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: FromContent) => void
  ) => {
    const run = async () => {
      if (message.type === "GET_SNAPSHOT") {
        const maxTokens = message.payload?.maxTokens;
        const result = extractPageSnapshot(maxTokens);
        return { type: "PAGE_SNAPSHOT" as const, payload: result };
      }
      if (message.type === "EXECUTE_ACTION") {
        const p = message.payload;
        let result;
        switch (p.action) {
          case "click":
            result = await executeClick(p.ref);
            break;
          case "type_text":
            result = await executeTypeText(p.ref, p.text);
            break;
          case "press_key":
            result = await executePressKey(p.ref, p.key);
            break;
          case "scroll":
            result = await executeScroll(p.direction, p.amount);
            break;
          case "select_option":
            result = await executeSelectOption(p.ref, p.value);
            break;
          case "wait":
            result = await executeWait(p.seconds);
            break;
          case "navigate":
            return sendResponse({
              type: "ACTION_RESULT",
              payload: { success: false, error: "navigate is handled by background" },
            });
          default:
            result = { success: false, error: "Unknown action" };
        }
        return { type: "ACTION_RESULT" as const, payload: result };
      }
      return null;
    };

    void run().then((r) => {
      if (r) sendResponse(r);
    });

    return true; // keep channel open for async sendResponse
  }
);
