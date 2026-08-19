import type { Launchpad } from "../server";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";
import { RecentCallsSection, type StoredCall } from "./recent-calls-section";
import {
  PANEL_CLIPPED_SURFACE_CLASS,
  PANEL_SECTION_CLASS,
  PANEL_SECTION_HEADING_CLASS,
} from "./ui/panel-styles";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export interface TupleLaunchpadViewProps {
  stateLoading: boolean;
  launchpad: Launchpad | null;
  loading: boolean;
  error: string | null;
  joining: string | null;
  historyQuery: string;
  historySearchResults: StoredCall[] | null;
  historySearchLoading: boolean;
  historySearchError: string | null;
  onRetry: () => void;
  onRetryHistorySearch: () => void;
  onHistoryQueryChange: (query: string) => void;
  onJoin: (target: string, id: string, copyUrl?: string) => void;
  onSelectRecording: (recording: StoredCall) => void;
}

export function TupleLaunchpadView({
  stateLoading,
  launchpad,
  loading,
  error,
  joining,
  historyQuery,
  historySearchResults,
  historySearchLoading,
  historySearchError,
  onRetry,
  onRetryHistorySearch,
  onHistoryQueryChange,
  onJoin,
  onSelectRecording,
}: TupleLaunchpadViewProps) {
  const personalRoom = launchpad?.personalRoom;

  if (stateLoading || loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-3 py-2 text-sm" aria-live="polite">
        <Icon name="Spinner" className="size-4 animate-spin" aria-hidden="true" />
        <span>Loading rooms and calls…</span>
      </div>
    );
  }

  return (
    <section className="@container space-y-5" aria-live="polite">
      {error ? (
        <div className="text-destructive flex items-center gap-2 text-sm">
          <span className="min-w-0 flex-1">{error}</span>
          <Button type="button" size="icon" variant="ghost" className="relative size-8 shrink-0" aria-label="Retry loading rooms and calls" onClick={onRetry}>
            <span className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true" />
            <Icon name="RotateCcw" className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      {personalRoom ? (
        <div className={PANEL_SECTION_CLASS}>
          <h3 className={PANEL_SECTION_HEADING_CLASS}>Personal room</h3>
          <div className={PANEL_CLIPPED_SURFACE_CLASS}>
            <button
              type="button"
              className="active:bg-muted/60 focus-visible:outline-ring hover:bg-muted/40 flex w-full min-w-0 cursor-pointer items-start gap-3 px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:cursor-wait disabled:hover:bg-transparent"
              disabled={joining !== null}
              onClick={() => onJoin(personalRoom.joinUrl, `room:${personalRoom.slug}`, personalRoom.joinUrl)}
            >
              <Icon name="GridView" className="text-muted-foreground size-4 h-lh shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Your room</span>
                <span className="text-muted-foreground block text-xs">Enter and copy link</span>
              </span>
              {joining === `room:${personalRoom.slug}` ? (
                <Icon name="Spinner" className="text-muted-foreground size-4 h-lh shrink-0 animate-spin" aria-hidden="true" />
              ) : null}
            </button>
          </div>
        </div>
      ) : null}

      {launchpad?.calls.length ? (
        <div className={PANEL_SECTION_CLASS}>
          <h3 className={PANEL_SECTION_HEADING_CLASS}>Happening now</h3>
          <div className={`${PANEL_CLIPPED_SURFACE_CLASS} divide-y divide-foreground/6`}>
            {launchpad.calls.map((call) => {
              const visibleParticipants = call.participants.slice(0, 3);
              const title = call.room?.name || call.participants.join(" & ") || "Tuple call";
              const people = call.participants.length + call.unknownParticipants;
              const joinTarget = call.joinTarget;
              return (
                <div key={call.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5">
                  <div className="flex shrink-0 -space-x-1.5" aria-hidden="true">
                    {(visibleParticipants.length ? visibleParticipants : ["Tuple"]).map((participant, index) => (
                      <span key={`${participant}-${index}`} className="bg-muted ring-background flex size-7 items-center justify-center rounded-full text-[0.625rem] font-semibold ring-2">
                        {initials(participant)}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{title}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {call.room?.name && call.participants.length ? call.participants.join(", ") : `${people || call.capacity} in the call`}
                    </div>
                  </div>
                  {call.joinable && joinTarget ? (
                    <Button type="button" size="sm" variant="secondary" disabled={joining !== null} onClick={() => onJoin(joinTarget, `call:${call.id}`)}>
                      {joining === `call:${call.id}` ? <Icon name="Spinner" className="size-4 animate-spin" aria-hidden="true" /> : null}
                      Join
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">Full</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <RecentCallsSection
        calls={launchpad?.history ?? []}
        query={historyQuery}
        searchResults={historySearchResults}
        searchLoading={historySearchLoading}
        searchError={historySearchError}
        onRetry={onRetry}
        onRetrySearch={onRetryHistorySearch}
        onQueryChange={onHistoryQueryChange}
        onSelect={onSelectRecording}
      />

      {!error && launchpad && !personalRoom && !launchpad.calls.length && !launchpad.history.length ? (
        <p className="text-muted-foreground text-sm">No Tuple rooms or calls yet.</p>
      ) : null}
    </section>
  );
}
