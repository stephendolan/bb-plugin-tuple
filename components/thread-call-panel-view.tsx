import type { FormEvent } from "react";
import type { CallState } from "../server";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";
import { Input } from "./ui/input";
import { PANEL_SECTION_HEADING_CLASS, PANEL_SURFACE_CLASS } from "./ui/panel-styles";

function callDescription(state: CallState | null) {
  const call = state?.call;
  if (!call) return "Tuple is ready when your next call starts.";
  const participantCount = call.participants.length;
  let company: string;
  if (participantCount === 0) {
    company = call.roomKind === "personal"
      ? "Personal room"
      : call.roomName
        ? call.roomName
        : "Solo call";
  } else if (participantCount === 1) {
    company = `With ${call.participants[0]}`;
  } else {
    company = `With ${participantCount} others`;
  }
  return `${call.transcribing ? "Transcribing" : "Transcription is off"} · ${company}`;
}

export interface CallOverviewProps {
  state: CallState | null;
  loading: boolean;
  onRetry: () => void;
  onCopyJoinLink: () => void;
  onStartTranscription?: () => void;
  quiet?: boolean;
}

export function CallOverview({
  state,
  loading,
  onRetry,
  onCopyJoinLink,
  onStartTranscription,
  quiet = false,
}: CallOverviewProps) {
  const title = loading
    ? "Connecting to Tuple"
    : state?.error
      ? "Tuple is unavailable"
      : state?.inCall
        ? "Current call"
        : "No active Tuple call";

  return (
    <section
      className={`@container ${quiet ? "" : `${PANEL_SURFACE_CLASS} p-3`}`}
      aria-live="polite"
    >
      <div className="space-y-1">
        <div className="flex min-w-0 flex-wrap items-start gap-2.5">
          <h2 className="min-w-0 flex-1 font-semibold text-balance">{title}</h2>
          {state?.error ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="relative size-8 shrink-0"
              aria-label="Retry Tuple connection"
              onClick={onRetry}
            >
              <span className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true" />
              <Icon name="RotateCcw" className="size-4 shrink-0" aria-hidden="true" />
            </Button>
          ) : null}
          {state?.call ? (
            <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 @min-[22rem]:w-auto">
              {state.call.joinUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="px-2 @min-[17rem]:pr-2.5 @min-[17rem]:pl-1.5"
                  aria-label="Copy link"
                  onClick={onCopyJoinLink}
                >
                  <Icon name="Link" className="size-4 shrink-0" aria-hidden="true" />
                  <span className="sr-only @min-[17rem]:not-sr-only">Copy link</span>
                </Button>
              ) : null}
              {!quiet && !state.call.transcribing && onStartTranscription ? (
                <Button type="button" size="sm" className="pr-2.5 pl-1.5" onClick={onStartTranscription}>
                  <Icon name="Mic" className="size-4 shrink-0" aria-hidden="true" />
                  Start transcription
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="text-muted-foreground flex min-w-0 items-start gap-1.5 text-base sm:text-sm">
          {state?.inCall ? (
            <span className="flex h-lh shrink-0 items-center" aria-hidden="true">
              <span className={`size-1.5 rounded-full ${state.call?.transcribing ? "bg-emerald-500" : "bg-amber-400"}`} />
            </span>
          ) : null}
          <p className="min-w-0 text-pretty">
            {state?.error ?? callDescription(state)}
            {!quiet && !state?.error && state?.environment && state.environment !== "prod"
              ? ` · ${state.environment === "staging" ? "Staging" : "Development"}`
              : ""}
          </p>
        </div>
      </div>
    </section>
  );
}

export interface ThreadCallComposerCopy {
  label: string;
  placeholder: string;
  action: string;
}

export const currentThreadCallComposerCopy: ThreadCallComposerCopy = {
  label: "Ask the current thread to",
  placeholder: "Summarize decisions and suggest next steps",
  action: "Send {minutes} min of transcript",
};

export interface ThreadCallPanelViewProps {
  state: CallState;
  loading?: boolean;
  inputId?: string;
  minutes: number;
  task: string;
  sending: boolean;
  copy?: ThreadCallComposerCopy;
  onTaskChange: (task: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onCopyJoinLink: () => void;
  onStartTranscription: () => void;
}

export function ThreadCallPanelView({
  state,
  loading = false,
  inputId = "tuple-task",
  minutes,
  task,
  sending,
  copy = currentThreadCallComposerCopy,
  onTaskChange,
  onSend,
  onRetry,
  onCopyJoinLink,
  onStartTranscription,
}: ThreadCallPanelViewProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend();
  }

  return (
    <div className="isolate space-y-6 antialiased">
      <CallOverview
        state={state}
        loading={loading}
        onRetry={onRetry}
        onCopyJoinLink={onCopyJoinLink}
        quiet
      />
      {!state.call?.transcribing ? (
        <Button
          type="button"
          className="w-full pr-3 pl-2"
          onClick={onStartTranscription}
        >
          <Icon name="Mic" className="size-4 shrink-0" aria-hidden="true" />
          Start transcription
        </Button>
      ) : (
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-2">
            <label className={PANEL_SECTION_HEADING_CLASS} htmlFor={inputId}>{copy.label}</label>
            <Input
              id={inputId}
              name="tuple-task"
              type="text"
              value={task}
              onChange={(event) => onTaskChange(event.target.value)}
              placeholder={copy.placeholder}
            />
          </div>
          <Button
            type="submit"
            className="w-full pr-3 pl-2"
            disabled={!task.trim() || sending}
          >
            <Icon name={sending ? "Spinner" : "Sent"} className={`size-4 shrink-0 ${sending ? "animate-spin" : ""}`} aria-hidden="true" />
            {sending ? "Sending…" : copy.action.replace("{minutes}", String(minutes))}
          </Button>
        </form>
      )}
    </div>
  );
}
