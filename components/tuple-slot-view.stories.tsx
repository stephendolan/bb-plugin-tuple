import type { CallState } from "../server";
import { TupleComposerActionButton, TupleSidebarAccessory } from "./tuple-slot-view";

export default {
  title: "Tuple/Compact slots",
};

const noop = () => {};
const iconUrl = new URL("../assets/tuple-mark.svg", import.meta.url).href;

const liveCall: CallState = {
  environment: "staging",
  inCall: true,
  call: {
    callId: "call-story",
    muted: false,
    transcribing: true,
    roomSlug: "demo-room",
    roomName: "Demo room",
    roomKind: "personal",
    joinUrl: "https://staging.tuple.app/c/demo-room",
    participants: ["Example teammate"],
  },
  connection: "connected",
  error: null,
  updatedAt: "2026-08-18T20:00:00.000Z",
};

const states = [
  { label: "Idle", state: null, loading: false },
  { label: "Transcribing", state: liveCall, loading: false },
  { label: "Transcription off", state: { ...liveCall, call: { ...liveCall.call!, transcribing: false } }, loading: false },
  { label: "Working", state: liveCall, loading: true },
];

export function StateMatrix() {
  return (
    <main className="tuple-gallery" data-bb-plugin="tuple" data-testid="compact-slot-matrix">
      <header className="tuple-gallery-header">
        <h1>Tuple compact slot states</h1>
        <p>The composer action and sidebar accessory in every visible call state.</p>
      </header>
      <div className="tuple-copy-options">
        {states.map(({ label, state, loading }) => (
          <section className="tuple-copy-option" key={label}>
            <h2>{label}</h2>
            <div className="tuple-gallery-panel flex min-h-0 items-center justify-between" data-panel style={{ width: 280 }}>
              <div className="flex items-center gap-3">
                <TupleComposerActionButton
                  state={state}
                  loading={loading}
                  minutes={5}
                  iconUrl={iconUrl}
                  onAction={noop}
                />
                <span className="text-sm text-muted-foreground">Composer</span>
              </div>
              <TupleSidebarAccessory state={state} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
