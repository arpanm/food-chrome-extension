/**
 * Chrome extension message passing helpers.
 */

import type { FromSidepanel, FromBackground, FromContent, ContentRequest } from "./types";

export function sendToBackground(message: FromSidepanel): void {
  chrome.runtime.sendMessage(message).catch(() => {});
}

export function sendToContentScript(tabId: number, message: ContentRequest): Promise<FromContent[keyof FromContent]> {
  return chrome.tabs.sendMessage(tabId, message);
}

export function onMessageFromSidepanel(
  handler: (message: FromSidepanel, sender: chrome.runtime.MessageSender) => void | Promise<void>
): void {
  chrome.runtime.onMessage.addListener(
    (message: FromSidepanel, sender: chrome.runtime.MessageSender) => {
      if (sender.id !== chrome.runtime.id) return;
      void handler(message, sender);
      return true; // keep channel open for async response
    }
  );
}

export function onMessageFromContent(
  handler: (message: FromContent, sender: chrome.runtime.MessageSender) => void | Promise<void>
): void {
  chrome.runtime.onMessage.addListener(
    (message: FromContent, sender: chrome.runtime.MessageSender) => {
      if (sender.tab == null) return;
      void handler(message, sender);
      return true;
    }
  );
}

export function sendToSidepanel(message: FromBackground): void {
  chrome.runtime.sendMessage(message).catch(() => {});
}

export function postToSidepanel(message: FromBackground): void {
  // Side panel might not be open; try sendMessage (delivers to extension context)
  chrome.runtime.sendMessage(message).catch(() => {});
}
