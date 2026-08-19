import type { FormEvent, ReactNode } from "react";
import type { StoredCall } from "./tuple-launchpad-view";
import { storedCallTime, storedCallTitle } from "./tuple-launchpad-view";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";
import { Input } from "./ui/input";

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
        className="-ml-2 pl-1.5 pr-2.5 text-muted-foreground"
        onClick={onBack}
      >
        <Icon name="ChevronLeft" className="size-4" aria-hidden="true" />
        Recent calls
      </Button>

      <div className="space-y-2">
        <h2 className="px-3 text-xs font-medium text-muted-foreground">Recorded call</h2>
        <div className="rounded-lg bg-muted/15 p-3 ring-1 ring-foreground/8">
          <div className="min-w-0 @min-[26rem]:grid @min-[26rem]:grid-cols-[minmax(0,1fr)_8.75rem] @min-[26rem]:gap-x-3">
            <h1 className="truncate text-sm font-semibold leading-tight">{storedCallTitle(recording)}</h1>
            <p className="mt-0.5 truncate text-[0.6875rem] leading-tight text-muted-foreground tabular-nums @min-[26rem]:col-start-2 @min-[26rem]:row-start-1 @min-[26rem]:mt-0">
              {storedCallTime(recording)}
            </p>
            {recording.summary ? (
              <p className="mt-2 text-pretty text-sm leading-relaxed text-foreground/85 @min-[26rem]:col-start-1 @min-[26rem]:row-start-2">
                {recording.summary}
              </p>
            ) : null}
            <p className="mt-0.5 text-[0.6875rem] leading-snug text-muted-foreground opacity-70 @min-[26rem]:col-start-2 @min-[26rem]:row-start-2">
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
              value={task}
              onChange={(event) => onTaskChange?.(event.target.value)}
              placeholder="Summarize decisions and identify follow-ups"
            />
          </div>
          <Button type="submit" className="w-full pl-2 pr-3" disabled={!task.trim() || sending}>
            <Icon name={sending ? "Spinner" : "Sent"} className={`size-4 shrink-0 ${sending ? "animate-spin" : ""}`} aria-hidden="true" />
            {sending ? "Sending…" : "Send recorded call"}
          </Button>
        </form>
      ) : (
        <section className="space-y-3">
          <div>
            <h2 className="text-balance font-semibold">Start a new thread</h2>
            <p className="text-pretty text-base text-muted-foreground sm:text-sm">
              The new thread will read this recording directly from Tuple.
            </p>
          </div>
          {newThreadComposer}
        </section>
      )}
    </section>
  );
}
