import type { CallState, TranscriptSnapshot } from "../server";
import { NewCallThreadView } from "./new-call-thread-view";
import { PANEL_SURFACE_CLASS } from "./ui/panel-styles";

export default {
  title: "Tuple/New thread from call",
};

const noop = () => {};

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

const snapshot: TranscriptSnapshot = {
  callId: "call-story",
  minutes: 5,
  capturedAt: "2026-08-18T20:05:00.000Z",
  segmentCount: 4,
  truncated: false,
  transcript: "[4:01 PM] Demo host: Let’s use the smaller launch.\n[4:02 PM] Example teammate: I’ll draft the customer follow-up.",
  promptContext: "Synthetic recent Tuple context.",
};

const scenarios = [
  { label: "Ready", state: liveCall, snapshot: null, capturing: false },
  { label: "Capturing", state: liveCall, snapshot: null, capturing: true },
  { label: "Transcription off", state: { ...liveCall, call: { ...liveCall.call!, transcribing: false } }, snapshot: null, capturing: false },
  { label: "Captured", state: liveCall, snapshot, capturing: false },
  { label: "Recapturing", state: liveCall, snapshot, capturing: true },
  { label: "Empty capture", state: liveCall, snapshot: { ...snapshot, segmentCount: 0, transcript: "" }, capturing: false },
  { label: "Trimmed capture", state: liveCall, snapshot: { ...snapshot, truncated: true }, capturing: false },
];

const widths = [280, 360, 480, 600] as const;

export function StateMatrix() {
  return (
    <main className="tuple-gallery" data-bb-plugin="tuple" data-testid="new-call-thread-matrix">
      <header className="tuple-gallery-header">
        <h1>Tuple new-thread capture state matrix</h1>
        <p>The live call-to-thread flow before, during, and after bounded transcript capture.</p>
      </header>
      <div className="tuple-gallery-grid">
        <div />
        {widths.map((width) => <div className="tuple-gallery-axis" key={width}>{width}px</div>)}
        {scenarios.map((scenario) => (
          <div className="tuple-gallery-row" key={scenario.label}>
            <div className="tuple-gallery-state">{scenario.label}</div>
            {widths.map((width) => (
              <section
                key={width}
                className="tuple-gallery-panel tuple-gallery-panel-auto"
                data-panel
                data-state={scenario.label}
                data-width={width}
                style={{ width }}
              >
                <NewCallThreadView
                  state={scenario.state}
                  loading={false}
                  minutes={5}
                  snapshot={scenario.snapshot}
                  capturing={scenario.capturing}
                  onRetry={noop}
                  onCopyJoinLink={noop}
                  onStartTranscription={noop}
                  onCapture={noop}
                  newThreadComposer={
                    <div className={`${PANEL_SURFACE_CLASS} p-3 text-sm text-muted-foreground`}>
                      BB new-thread composer slot
                    </div>
                  }
                />
              </section>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
