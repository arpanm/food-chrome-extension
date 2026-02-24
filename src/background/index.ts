/**
 * Background service worker: message router and agent orchestration.
 */

import type { FromSidepanel, Config } from "../shared/types";
import { runAgent, abortAgent, registerUserAnswer, getSwiggyTabId, getOrCreateSwiggyTab } from "./agent";
import { DEFAULT_MODEL } from "../shared/constants";
import { postToSidepanel } from "../shared/messages";

const CONFIG_STORAGE_KEY = "swiggy_agent_config";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

function getConfig(): Promise<Config> {
  return new Promise((resolve) => {
    chrome.storage.local.get([CONFIG_STORAGE_KEY], (result) => {
      const stored = result[CONFIG_STORAGE_KEY];
      resolve(
        stored && typeof stored === "object"
          ? {
              apiKey: stored.apiKey ?? "",
              backendUrl: stored.backendUrl ?? "",
              model: stored.model ?? DEFAULT_MODEL,
            }
          : { apiKey: "", backendUrl: "", model: DEFAULT_MODEL }
      );
    });
  });
}

function notifyErrorAndDone(error: string): void {
  postToSidepanel({
    type: "AGENT_MESSAGE",
    payload: {
      id: `err-${Date.now()}`,
      role: "assistant",
      content: error,
      timestamp: Date.now(),
    },
  });
  postToSidepanel({ type: "AGENT_DONE", payload: { error } });
}

chrome.runtime.onMessage.addListener(
  (
    message: FromSidepanel,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message.type === "SEND_MESSAGE") {
      const text = message.payload?.text ?? "";
      if (!text.trim()) {
        sendResponse();
        return true;
      }
      void (async () => {
        const config = await getConfig();
        if (!config.apiKey && !config.backendUrl?.trim()) {
          notifyErrorAndDone("Set your API key or backend URL in Settings.");
          sendResponse();
          return;
        }
        const tabId = await getOrCreateSwiggyTab();
        if (tabId == null) {
          notifyErrorAndDone("Could not open Swiggy. Please try again.");
          sendResponse();
          return;
        }
        runAgent(config, tabId, text.trim(), () => {});
      })();
      return true;
    }

    if (message.type === "STOP_AGENT") {
      abortAgent();
      sendResponse();
      return true;
    }

    if (message.type === "GET_CONFIG") {
      getConfig().then((config) => sendResponse({ type: "CONFIG", payload: config }));
      return true;
    }

    if (message.type === "SAVE_CONFIG") {
      chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: message.payload });
      sendResponse();
      return true;
    }

    if (message.type === "GET_TAB_ID") {
      getSwiggyTabId().then((id) => sendResponse({ type: "TAB_ID", payload: id }));
      return true;
    }

    if (message.type === "USER_ANSWER") {
      const { id, answer } = message.payload;
      registerUserAnswer(id, answer);
      sendResponse();
      return true;
    }

    return false;
  }
);
