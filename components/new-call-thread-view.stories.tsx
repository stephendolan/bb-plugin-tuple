import type { CallState, TranscriptSnapshot } from "../server";
import { NewCallThreadView } from "./new-call-thread-view";
import { PreviewMatrix } from "./preview-gallery";
import { RecentCallsSection, type StoredCall } from "./recent-calls-section";
import { storyTodayAt } from "./story-date";
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
  since: "2026-08-18T20:00:00.000Z",
  until: "2026-08-18T20:05:00.000Z",
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

const recentCalls: StoredCall[] = [
  {
    callId: "earlier-call-1",
    title: "Launch readiness review",
    summary: "Chose the smaller launch and assigned the remaining customer follow-ups.",
    startedAt: storyTodayAt("09:15:00.000"),
    endedAt: storyTodayAt("09:40:00.000"),
    participants: ["Demo host", "Example teammate"],
    promptContext: "Use earlier call one.",
  },
  {
    callId: "earlier-call-2",
    title: "Agent workflow rehearsal",
    summary: "Tested the agent handoff and screen-sharing workflow.",
    startedAt: storyTodayAt("08:30:00.000"),
    endedAt: storyTodayAt("08:42:00.000"),
    participants: ["Demo host", "Test agent"],
    promptContext: "Use earlier call two.",
  },
];

export function StateMatrix() {
  return (
    <PreviewMatrix
      testId="new-call-thread-matrix"
      title="Tuple new-thread capture state matrix"
      description="The live call-to-thread flow before, during, and after bounded transcript capture."
      scenarios={scenarios}
      autoHeight
      render={(scenario) => (
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
      )}
    />
  );
}

export function WithRecentCalls() {
  return (
    <PreviewMatrix
      testId="live-call-history-matrix"
      title="Tuple live call with history"
      description="The current call remains primary while earlier recordings stay directly available below it."
      scenarios={[{ label: "Current + history" }]}
      autoHeight
      render={() => (
        <div className="@container space-y-5">
          <NewCallThreadView
            state={liveCall}
            loading={false}
            minutes={5}
            snapshot={null}
            capturing={false}
            onRetry={noop}
            onCopyJoinLink={noop}
            onStartTranscription={noop}
            onCapture={noop}
          />
          <RecentCallsSection
            calls={recentCalls}
            query=""
            searchResults={null}
            searchLoading={false}
            searchError={null}
            onRetry={noop}
            onRetrySearch={noop}
            onQueryChange={noop}
            onSelect={noop}
          />
        </div>
      )}
    />
  );
}
