import React, { useState } from "react";

interface Props {
  question: string;
  id: string;
  options?: string[];
  recommendedIndex?: number;
  onSubmit: (id: string, answer: string) => void;
}

export default function AskUserPrompt({
  question,
  id,
  options,
  recommendedIndex,
  onSubmit,
}: Props) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = () => {
    onSubmit(id, answer.trim() || "Yes");
    setAnswer("");
  };

  const handleOptionClick = (value: string) => {
    onSubmit(id, value);
  };

  const hasOptions = options && options.length > 0;
  const validRecommended =
    hasOptions &&
    recommendedIndex != null &&
    recommendedIndex >= 0 &&
    recommendedIndex < options.length;

  return (
    <div className="mx-3 mb-3 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50 to-orange-50/50 shadow-md overflow-hidden">
      <div className="p-4 pb-2">
        <p className="text-sm font-semibold text-gray-800 leading-snug">{question}</p>
      </div>

      {hasOptions ? (
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-0.5">
            {options.map((opt, idx) => {
              const isRecommended = validRecommended && idx === recommendedIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleOptionClick(opt)}
                  className={`w-full text-left rounded-xl px-4 py-3.5 transition-all duration-150 flex items-start gap-3 ${
                    isRecommended
                      ? "bg-white border-2 border-orange-400 shadow-md hover:shadow-lg hover:border-orange-500 ring-2 ring-orange-200/50"
                      : "bg-white/90 border border-gray-200/80 hover:bg-white hover:border-amber-300 hover:shadow-sm"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isRecommended ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-gray-800 leading-snug pt-0.5">
                    {opt}
                  </span>
                  {isRecommended && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold">
                      Recommended
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="pt-1 border-t border-amber-200/60">
            <p className="text-xs text-gray-500 mb-2">Or type a custom answer:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Type and press Enter"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 shrink-0 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4 flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Type your answer (or press Enter for Yes)"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
