"use client";

import { useState } from "react";

type Props = {
  value: string;
  className?: string;
  title?: string;
};

export function CopyButton({ value, className, title }: Props) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      title={title ?? "复制"}
      className={
        className ??
        "inline-flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-900/70 hover:text-zinc-100"
      }
    >
      {copied ? "已复制" : "复制"}
    </button>
  );
}

