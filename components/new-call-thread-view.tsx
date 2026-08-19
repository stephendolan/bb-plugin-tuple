import type { ReactNode } from "react";
import type { CallState, TranscriptSnapshot } from "../server";
import { CallOverview } from "./thread-call-panel-view";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";
import {
  PANEL_SECTION_CLASS,
  PANEL_SECTION_HEADING_CLASS,
  PANEL_SURFACE_CLASS,
} from "./ui/panel-styles";

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
          <section className={PANEL_SECTION_CLASS}>
            <h2 className={PANEL_SECTION_HEADING_CLASS}>New thread</h2>
            <div className={`${PANEL_SURFACE_CLASS} flex flex-col items-start gap-4 p-3 @min-[26rem]:flex-row @min-[26rem]:items-center @min-[26rem]:justify-between`}>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-balance">Start from this conversation</h3>
                <p className="text-muted-foreground mt-0.5 max-w-[65ch] text-base text-pretty sm:text-sm">
                  Review the recent transcript before starting the thread.
                </p>
              </div>
              <Button
                type="button"
                className="shrink-0 pr-3 pl-2"
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
          <section className={PANEL_SECTION_CLASS}>
            <h2 className={PANEL_SECTION_HEADING_CLASS}>Recent conversation</h2>
            <div className={`${PANEL_SURFACE_CLASS} p-3`}>
              <div className="flex min-w-0 items-start gap-3">
                <p className="text-muted-foreground min-w-0 flex-1 text-sm">
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
              <pre className="bg-muted/30 text-foreground/85 mt-3 max-h-64 overflow-auto rounded-md p-3 text-sm/5 whitespace-pre-wrap">
                {snapshot.transcript || "No speech was captured in this window."}
              </pre>
            </div>
          </section>

          <section className="space-y-3">
            <div className="space-y-0.5">
              <h2 className={PANEL_SECTION_HEADING_CLASS}>New thread</h2>
              <p className="text-muted-foreground px-3 text-base text-pretty sm:text-sm">
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
