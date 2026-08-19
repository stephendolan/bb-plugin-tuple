import type { FormEvent, ReactNode } from "react";
import type { StoredCall } from "./tuple-launchpad-view";
import { storedCallTime, storedCallTitle } from "./tuple-launchpad-view";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";
import { Input } from "./ui/input";
import {
  PANEL_SECTION_CLASS,
  PANEL_SECTION_HEADING_CLASS,
  PANEL_SURFACE_CLASS,
} from "./ui/panel-styles";

export interface StoredCallSelectionViewProps {
  recording: StoredCall;
  destination: "current-thread" | "new-thread";
  task?: string;
  sending?: boolean;
  inputId?: string;
  newThreadComposer?: ReactNode;
  onBack: () => void;
  onTaskChange?: (task: string) => void;
  onSend?: () => void;
}

export function StoredCallSelectionView({
  recording,
  destination,
  task = "",
  sending = false,
  inputId = `tuple-recording-task-${recording.callId}`,
  newThreadComposer,
  onBack,
  onTaskChange,
  onSend,
}: StoredCallSelectionViewProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend?.();
  }

  const participantCount = recording.participants.length;

  return (
    <section className="@container space-y-5">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground -ml-2 pr-2.5 pl-1.5"
        onClick={onBack}
      >
        <Icon name="ChevronLeft" className="size-4" aria-hidden="true" />
        Recent calls
      </Button>

      <div className={PANEL_SECTION_CLASS}>
        <h2 className={PANEL_SECTION_HEADING_CLASS}>Recorded call</h2>
        <div className={`${PANEL_SURFACE_CLASS} p-3`}>
          <div className="min-w-0 @min-[26rem]:grid @min-[26rem]:grid-cols-[minmax(0,1fr)_8.75rem] @min-[26rem]:gap-x-3">
            <h1 className="truncate text-sm font-semibold">{storedCallTitle(recording)}</h1>
            <p className="text-muted-foreground mt-0.5 truncate text-[0.6875rem] tabular-nums @min-[26rem]:col-start-2 @min-[26rem]:row-start-1 @min-[26rem]:mt-0">
              {storedCallTime(recording)}
            </p>
            {recording.summary ? (
              <p className="text-foreground/85 mt-2 text-sm/5 text-pretty @min-[26rem]:col-start-1 @min-[26rem]:row-start-2">
                {recording.summary}
              </p>
            ) : null}
            <p className="text-muted-foreground mt-0.5 text-[0.6875rem] opacity-70 @min-[26rem]:col-start-2 @min-[26rem]:row-start-2">
              {participantCount} {participantCount === 1 ? "participant" : "participants"}
            </p>
          </div>
        </div>
      </div>

      {destination === "current-thread" ? (
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-base font-medium sm:text-sm" htmlFor={inputId}>Ask the current thread to</label>
            <Input
              id={inputId}
              name="tuple-recording-task"
              type="text"
              value={task}
              onChange={(event) => onTaskChange?.(event.target.value)}
              placeholder="Summarize decisions and identify follow-ups"
            />
          </div>
          <Button type="submit" className="w-full pr-3 pl-2" disabled={!task.trim() || sending}>
            <Icon name={sending ? "Spinner" : "Sent"} className={`size-4 shrink-0 ${sending ? "animate-spin" : ""}`} aria-hidden="true" />
            {sending ? "Sending…" : "Send recorded call"}
          </Button>
        </form>
      ) : (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold text-balance">Start a new thread</h2>
            <p className="text-muted-foreground text-base text-pretty sm:text-sm">
              The new thread will read this recording directly from Tuple.
            </p>
          </div>
          {newThreadComposer}
        </section>
      )}
    </section>
  );
}
