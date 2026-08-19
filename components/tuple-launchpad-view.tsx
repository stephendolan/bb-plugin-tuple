import type { Launchpad } from "../server";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export type StoredCall = Launchpad["history"][number];

export function storedCallTitle(call: StoredCall) {
  return call.title || call.participants.join(" & ") || "Recorded Tuple call";
}

export function storedCallTime(call: StoredCall) {
  const started = new Date(call.startedAt);
  const today = new Date();
  const isToday = started.toDateString() === today.toDateString();
  const date = isToday
    ? "Today"
    : started.toLocaleDateString([], { month: "short", day: "numeric" });
  const time = started.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (!call.endedAt) return `${date} · ${time}`;
  const minutes = Math.max(1, Math.round((new Date(call.endedAt).getTime() - started.getTime()) / 60_000));
  return `${date} · ${time} · ${minutes} min`;
}

export interface TupleLaunchpadViewProps {
  stateLoading: boolean;
  launchpad: Launchpad | null;
  loading: boolean;
  error: string | null;
  joining: string | null;
  onRetry: () => void;
  onJoin: (target: string, id: string, copyUrl?: string) => void;
  onSelectRecording: (recording: StoredCall) => void;
}

export function TupleLaunchpadView({
  stateLoading,
  launchpad,
  loading,
  error,
  joining,
  onRetry,
  onJoin,
  onSelectRecording,
}: TupleLaunchpadViewProps) {
  const personalRoom = launchpad?.personalRoom;

  if (stateLoading || loading) {
    return (
      <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground" aria-live="polite">
        <Icon name="Spinner" className="size-4 animate-spin" aria-hidden="true" />
        <span>Loading rooms and calls…</span>
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-live="polite">
      {error ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span className="min-w-0 flex-1">{error}</span>
          <Button type="button" size="icon" variant="ghost" className="relative size-8 shrink-0" aria-label="Retry loading rooms and calls" onClick={onRetry}>
            <span className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true" />
            <Icon name="RotateCcw" className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      {personalRoom ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Personal room</h3>
          <div className="-mx-2">
            <button
              type="button"
              className="active:bg-muted/60 focus-visible:outline-ring hover:bg-muted/40 flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-md p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:hover:bg-transparent"
              disabled={joining !== null}
              onClick={() => onJoin(personalRoom.joinUrl, `room:${personalRoom.slug}`, personalRoom.joinUrl)}
            >
              <Icon name="GridView" className="size-4 h-lh shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Your room</span>
                <span className="block text-xs text-muted-foreground">Enter and copy link</span>
              </span>
              {joining === `room:${personalRoom.slug}` ? (
                <Icon name="Spinner" className="size-4 h-lh shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : null}
            </button>
          </div>
        </div>
      ) : null}

      {launchpad?.calls.length ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Happening now</h3>
          <div className="space-y-1">
            {launchpad.calls.map((call) => {
              const visibleParticipants = call.participants.slice(0, 3);
              const title = call.room?.name || call.participants.join(" & ") || "Tuple call";
              const people = call.participants.length + call.unknownParticipants;
              const joinTarget = call.joinTarget;
              return (
                <div key={call.id} className="flex min-w-0 items-center gap-3 py-1">
                  <div className="flex shrink-0 -space-x-1.5" aria-hidden="true">
                    {(visibleParticipants.length ? visibleParticipants : ["Tuple"]).map((participant, index) => (
                      <span key={`${participant}-${index}`} className="flex size-7 items-center justify-center rounded-full bg-muted text-[0.625rem] font-semibold ring-2 ring-background">
                        {initials(participant)}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {call.room?.name && call.participants.length ? call.participants.join(", ") : `${people || call.capacity} in the call`}
                    </div>
                  </div>
                  {call.joinable && joinTarget ? (
                    <Button type="button" size="sm" variant="secondary" disabled={joining !== null} onClick={() => onJoin(joinTarget, `call:${call.id}`)}>
                      {joining === `call:${call.id}` ? <Icon name="Spinner" className="size-4 animate-spin" aria-hidden="true" /> : null}
                      Join
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Full</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {launchpad?.history.length ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Recent calls</h3>
          <div className="-mx-2 space-y-0.5">
            {launchpad.history.map((call) => (
              <button
                key={call.callId}
                type="button"
                className="active:bg-muted/60 focus-visible:outline-ring hover:bg-muted/40 w-full min-w-0 cursor-pointer rounded-md px-2 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={() => onSelectRecording(call)}
              >
                <span className="block truncate text-sm font-medium">{storedCallTitle(call)}</span>
                {call.summary ? (
                  <span className="block truncate text-xs text-muted-foreground" title={call.summary}>{call.summary}</span>
                ) : null}
                <span className={`block truncate text-xs text-muted-foreground ${call.summary ? "opacity-75" : ""}`}>
                  {storedCallTime(call)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!error && launchpad && !personalRoom && !launchpad.calls.length && !launchpad.history.length ? (
        <p className="text-sm text-muted-foreground">No Tuple rooms or calls yet.</p>
      ) : null}
    </section>
  );
}
