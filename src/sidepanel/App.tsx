import React, { useState, useEffect, useCallback } from "react";
import type { ChatMessage as ChatMessageType, Config } from "../shared/types";
import { sendToBackground } from "../shared/messages";
import { DEFAULT_MODEL } from "../shared/constants";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import SettingsPanel from "./components/SettingsPanel";
import AskUserPrompt from "./components/AskUserPrompt";

const DEFAULT_CONFIG: Config = {
  apiKey: "",
  backendUrl: "",
  model: DEFAULT_MODEL,
};

const STORAGE_KEY_MESSAGES = "swiggy_agent_messages";
const STORAGE_KEY_CONFIG = "swiggy_agent_config";

export default function App() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [currentAction, setCurrentAction] = useState<{ tool: string; detail?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [askUser, setAskUser] = useState<{
    question: string;
    id: string;
    options?: string[];
    recommendedIndex?: number;
  } | null>(null);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY_CONFIG], (result) => {
      if (result[STORAGE_KEY_CONFIG]) {
        setConfig({ ...DEFAULT_CONFIG, ...result[STORAGE_KEY_CONFIG] });
      }
    });
    chrome.storage.local.get([STORAGE_KEY_MESSAGES], (result) => {
      if (Array.isArray(result[STORAGE_KEY_MESSAGES])) {
        setMessages(result[STORAGE_KEY_MESSAGES]);
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ [STORAGE_KEY_MESSAGES]: messages });
  }, [messages]);

  const handleIncomingMessage = useCallback((msg: unknown) => {
    const m = msg as { type: string; payload?: unknown };
    switch (m.type) {
      case "AGENT_MESSAGE":
        setMessages((prev) => [...prev, m.payload as ChatMessageType]);
        break;
      case "AGENT_ACTION":
        setCurrentAction((m.payload as { tool: string; detail?: string }) ?? null);
        break;
      case "AGENT_DONE":
        setCurrentAction(null);
        setIsLoading(false);
        if ((m.payload as { error?: string })?.error) {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: "assistant",
              content: (m.payload as { error: string }).error,
              timestamp: Date.now(),
            },
          ]);
        }
        break;
      case "ASK_USER":
        setAskUser(m.payload as {
          question: string;
          id: string;
          options?: string[];
          recommendedIndex?: number;
        });
        break;
      case "CONFIG":
        setConfig((m.payload as Config) ?? DEFAULT_CONFIG);
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    chrome.runtime.onMessage.addListener(handleIncomingMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleIncomingMessage);
    };
  }, [handleIncomingMessage]);

  const handleSend = useCallback(
    (text: string) => {
      const userMsg: ChatMessageType = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      sendToBackground({ type: "SEND_MESSAGE", payload: { text } });
    },
    []
  );

  const handleStop = useCallback(() => {
    sendToBackground({ type: "STOP_AGENT" });
  }, []);

  const handleSaveConfig = useCallback((newConfig: Config) => {
    setConfig(newConfig);
    chrome.storage.local.set({ [STORAGE_KEY_CONFIG]: newConfig });
    sendToBackground({ type: "SAVE_CONFIG", payload: newConfig });
  }, []);

  const handleUserAnswer = useCallback((id: string, answer: string) => {
    setAskUser(null);
    sendToBackground({ type: "USER_ANSWER", payload: { id, answer } });
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200">
        <span className="font-semibold text-gray-800">Swiggy Food Agent</span>
        <div className="flex items-center gap-1">
          {isLoading && (
            <button
              type="button"
              onClick={handleStop}
              className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <ChatWindow
        messages={messages}
        currentAction={currentAction}
        isLoading={isLoading}
      />

      {askUser && (
        <AskUserPrompt
          question={askUser.question}
          id={askUser.id}
          options={askUser.options}
          recommendedIndex={askUser.recommendedIndex}
          onSubmit={handleUserAnswer}
        />
      )}

      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
      />

      {showSettings && (
        <SettingsPanel
          initialConfig={config}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
}
