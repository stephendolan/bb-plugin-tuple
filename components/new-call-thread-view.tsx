import type { ReactNode } from "react";
import type { CallState, TranscriptSnapshot } from "../server";
import { CallOverview } from "./thread-call-panel-view";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";

export interface NewCallThreadViewProps {
  state: CallState;
  loading: boolean;
  minutes: number;
  snapshot: TranscriptSnapshot | null;
  capturing: boolean;
  newThreadComposer?: ReactNode;
  onRetry: () => void;
  onCopyJoinLink: () => void;
  onStartTranscription: () => void;
  onCapture: () => void;
}

export function NewCallThreadView({
  state,
  loading,
  minutes,
  snapshot,
  capturing,
  newThreadComposer,
  onRetry,
  onCopyJoinLink,
  onStartTranscription,
  onCapture,
}: NewCallThreadViewProps) {
  return (
    <div className="@container space-y-5">
      <CallOverview
        state={state}
        loading={loading}
        onRetry={onRetry}
        onCopyJoinLink={onCopyJoinLink}
        onStartTranscription={onStartTranscription}
      />

      {!snapshot ? (
        state.call?.transcribing ? (
          <section className="space-y-2">
            <h2 className="px-3 text-xs font-medium text-muted-foreground">New thread</h2>
            <div className="flex flex-col items-start gap-4 rounded-lg bg-muted/15 p-3 ring-1 ring-foreground/8 @min-[26rem]:flex-row @min-[26rem]:items-center @min-[26rem]:justify-between">
              <div className="min-w-0">
                <h3 className="text-balance text-sm font-semibold">Start from this conversation</h3>
                <p className="mt-0.5 max-w-[65ch] text-pretty text-base text-muted-foreground sm:text-sm">
                  Review the recent transcript before starting the thread.
                </p>
              </div>
              <Button
                type="button"
                className="shrink-0 pl-2 pr-3"
                disabled={capturing}
                onClick={onCapture}
              >
                <Icon name={capturing ? "Spinner" : "BubbleChatQuestion"} className={`size-4 shrink-0 ${capturing ? "animate-spin" : ""}`} aria-hidden="true" />
                {capturing ? "Capturing…" : `Use last ${minutes} min`}
              </Button>
            </div>
          </section>
        ) : null
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="px-3 text-xs font-medium text-muted-foreground">Recent conversation</h2>
            <div className="rounded-lg bg-muted/15 p-3 ring-1 ring-foreground/8">
              <div className="flex min-w-0 items-start gap-3">
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {snapshot.segmentCount} speech segment{snapshot.segmentCount === 1 ? "" : "s"} · Last {snapshot.minutes} min
                  {snapshot.truncated ? " · Oldest text trimmed" : ""}
                </p>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="relative -m-2 size-8 shrink-0"
                  disabled={capturing}
                  aria-label="Recapture the latest conversation"
                  onClick={onCapture}
                >
                  <span className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true" />
                  <Icon name={capturing ? "Spinner" : "RotateCcw"} className={`size-4 shrink-0 ${capturing ? "animate-spin" : ""}`} aria-hidden="true" />
                </Button>
              </div>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm leading-relaxed text-foreground/85">
                {snapshot.transcript || "No speech was captured in this window."}
              </pre>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-balance font-semibold">Start a new thread</h2>
              <p className="text-pretty text-base text-muted-foreground sm:text-sm">
                Add a task for the thread, then choose how it should run.
              </p>
            </div>
            {newThreadComposer}
          </section>
        </>
      )}
    </div>
  );
}
