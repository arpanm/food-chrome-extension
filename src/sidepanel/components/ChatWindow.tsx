import React, { useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType } from "../../shared/types";
import ChatMessage from "./ChatMessage";
import ActionIndicator from "./ActionIndicator";

interface Props {
  messages: ChatMessageType[];
  currentAction?: { tool: string; detail?: string } | null;
  isLoading?: boolean;
}

export default function ChatWindow({
  messages,
  currentAction,
  isLoading,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentAction]);

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
      {messages.length === 0 && !currentAction && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 text-sm px-4">
          <p className="font-medium text-gray-700">Swiggy Food Agent</p>
          <p className="mt-1">
            Open Swiggy in a tab, then tell me what you want: search restaurants, add items to cart, or place an order.
          </p>
          <p className="mt-3 text-xs">e.g. &quot;Order 2 paneer butter masala from a nearby restaurant&quot;</p>
        </div>
      )}
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {currentAction && (
        <ActionIndicator tool={currentAction.tool} detail={currentAction.detail} />
      )}
      {isLoading && !currentAction && (
        <div className="flex justify-center my-2">
          <span className="text-xs text-gray-500">Thinking...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
