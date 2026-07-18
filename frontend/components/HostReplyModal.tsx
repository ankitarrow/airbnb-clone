"use client";

import { MessageCircle } from "lucide-react";
import { formatMessageTimestamp } from "@/lib/date";

interface Props {
  reply: string;
  replyAt?: string | null;
  className?: string;
}

export default function HostReply({ reply, replyAt, className = "" }: Props) {
  return (
    <div className={`rounded-xl border border-cyan-600/20 bg-cyan-600/5 px-4 py-3 ${className}`}>
      <div className="flex items-center gap-1.5">
        <MessageCircle className="h-3.5 w-3.5 text-cyan-600" />
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Host response</p>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground">{reply}</p>
      {replyAt && (
        <p className="mt-2 text-xs text-muted-foreground">{formatMessageTimestamp(replyAt)}</p>
      )}
    </div>
  );
}