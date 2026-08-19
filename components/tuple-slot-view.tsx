import type { CallState } from "../server";
import { Icon } from "./ui/icon";

const defaultTupleCompactIconUrl = "/api/v1/plugins/tuple/assets/icon";

export function TupleStatusIcon({
  state,
  iconUrl = defaultTupleCompactIconUrl,
}: {
  state: CallState | null;
  iconUrl?: string;
}) {
  const mask = `url("${iconUrl}")`;
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
      <span
        className="size-4 bg-current"
        style={{
          maskImage: mask,
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskImage: mask,
          WebkitMaskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
        }}
      />
      {state?.inCall ? (
        <span className="absolute right-0 bottom-0 size-1.5 rounded-full bg-emerald-500 ring-1 ring-background" />
      ) : null}
    </span>
  );
}

export function TupleSidebarAccessory({ state }: { state: CallState | null }) {
  if (!state?.inCall) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`size-1.5 shrink-0 rounded-full ${state.call?.transcribing ? "bg-emerald-500" : "bg-amber-400"}`} />
      {state.call?.transcribing ? "Live" : "In call"}
    </div>
  );
}

export function TupleComposerActionButton({
  state,
  loading,
  minutes,
  iconUrl,
  onAction,
}: {
  state: CallState | null;
  loading: boolean;
  minutes: number;
  iconUrl?: string;
  onAction: () => void;
}) {
  const label = !state?.inCall
    ? "Open Tuple"
    : state.call?.transcribing
      ? `Add the last ${minutes} minutes of this Tuple call to the draft`
      : "Start Tuple transcription";

  return (
    <button
      type="button"
      className="focus-visible:outline-ring hover:bg-accent hover:text-foreground text-muted-foreground relative flex size-8 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
      disabled={loading}
      aria-label={label}
      title={label}
      onClick={onAction}
    >
      <span className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true" />
      {loading ? (
        <Icon name="Spinner" className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <TupleStatusIcon state={state} iconUrl={iconUrl} />
      )}
    </button>
  );
}
