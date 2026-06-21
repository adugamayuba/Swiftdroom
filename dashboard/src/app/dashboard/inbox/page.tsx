"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Inbox,
  Mail,
  MailOpen,
  RefreshCw,
  Copy,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  DashboardCard,
  DashboardPageHeader,
  DashboardSpinner,
} from "@/components/dashboard/ui";

interface InboxEmailItem {
  id: string;
  toAlias: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function EmailRow({
  email,
  onSelect,
}: {
  email: InboxEmailItem;
  onSelect: (e: InboxEmailItem) => void;
}) {
  const preview = email.body.replace(/\s+/g, " ").trim().slice(0, 100);
  return (
    <button
      onClick={() => onSelect(email)}
      className={`w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors flex items-start gap-3 ${!email.isRead ? "bg-blue-50/40" : ""}`}
    >
      <div className="mt-0.5 flex-shrink-0">
        {email.isRead ? (
          <MailOpen className="h-4 w-4 text-neutral-400" />
        ) : (
          <Mail className="h-4 w-4 text-blue-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${!email.isRead ? "font-semibold text-neutral-900" : "font-medium text-neutral-700"}`}>
            {email.fromName || email.fromEmail}
          </span>
          <span className="text-xs text-neutral-400 flex-shrink-0">{timeAgo(email.receivedAt)}</span>
        </div>
        <div className={`text-sm truncate ${!email.isRead ? "text-neutral-800" : "text-neutral-600"}`}>
          {email.subject || "(no subject)"}
        </div>
        {preview && (
          <div className="text-xs text-neutral-400 truncate mt-0.5">{preview}</div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-neutral-300 flex-shrink-0 mt-1" />
    </button>
  );
}

function EmailDetail({
  email,
  onClose,
}: {
  email: InboxEmailItem;
  onClose: () => void;
}) {
  const paragraphs = email.body.trim().split(/\n{2,}/).filter(Boolean);
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
        <button
          onClick={onClose}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back
        </button>
        <span className="text-xs text-neutral-400">{timeAgo(email.receivedAt)}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <h2 className="text-base font-semibold text-neutral-900 mb-4 leading-snug">
          {email.subject || "(no subject)"}
        </h2>
        <div className="rounded-lg bg-neutral-50 border border-neutral-100 px-4 py-3 space-y-1 text-xs text-neutral-500 mb-5">
          <div><span className="font-medium text-neutral-600 w-8 inline-block">From</span>
            {email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}
          </div>
          <div><span className="font-medium text-neutral-600 w-8 inline-block">To</span>
            {email.toAlias}
          </div>
        </div>
        <div className="text-sm text-neutral-800 leading-relaxed space-y-3">
          {paragraphs.length > 0
            ? paragraphs.map((para, i) => (
                <p key={i} className="whitespace-pre-wrap">{para.trim()}</p>
              ))
            : <p className="text-neutral-400 italic">No content</p>
          }
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const [alias, setAlias] = useState<string | null>(null);
  const [emails, setEmails] = useState<InboxEmailItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InboxEmailItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadInbox = useCallback(async () => {
    const res = await apiFetch("/api/inbox");
    if (res.ok) {
      const data = await res.json();
      setAlias(data.alias);
      setEmails(data.emails ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const handleSelect = async (email: InboxEmailItem) => {
    setSelected({ ...email, isRead: true });
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
    );
    if (!email.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
      apiFetch("/api/inbox", {
        method: "PATCH",
        body: JSON.stringify({ ids: [email.id] }),
      }).catch(() => {});
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInbox();
    setRefreshing(false);
  };

  const copyAlias = () => {
    if (!alias) return;
    navigator.clipboard.writeText(alias).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <DashboardSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Inbox"
        subtitle="Emails sent to your Swiftdroom address appear here — including interview requests and application confirmations."
      />

      {/* Alias card */}
      <DashboardCard>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Your Swiftdroom email address
            </p>
            <p className="text-sm font-mono text-neutral-900 font-medium">{alias}</p>
            <p className="text-xs text-neutral-400 mt-1">
              This address is used when submitting job applications on your behalf.
              Verification codes and recruiter replies arrive here automatically.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyAlias}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition"
            >
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition"
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </DashboardCard>

      {/* Inbox */}
      <DashboardCard className="p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700">
              Messages
            </span>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        {selected ? (
          <div style={{ minHeight: "400px" }}>
            <EmailDetail email={selected} onClose={() => setSelected(null)} />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <Mail className="h-5 w-5 text-neutral-400" />
            </div>
            <p className="text-sm font-medium text-neutral-600">No messages yet</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs">
              Emails sent to <strong>{alias}</strong> will appear here.
              When you apply to jobs, any recruiter replies or verification codes will show up automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {emails.map((email) => (
              <EmailRow key={email.id} email={email} onSelect={handleSelect} />
            ))}
          </div>
        )}
      </DashboardCard>

      {/* Info banner */}
      <div className="flex gap-2 text-xs text-neutral-500 bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-neutral-400" />
        <span>
          Verification codes from application systems are handled automatically — you don&apos;t need to do anything.
          For interview requests and recruiter messages, you&apos;ll also get a notification at your real email address.
        </span>
      </div>
    </div>
  );
}
