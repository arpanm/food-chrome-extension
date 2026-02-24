import React from "react";

interface Props {
  tool: string;
  detail?: string;
}

export default function ActionIndicator({ tool, detail }: Props) {
  const label = detail ? `${tool}: ${detail}` : tool;
  return (
    <div className="flex justify-center my-2">
      <span className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {label}
      </span>
    </div>
  );
}
