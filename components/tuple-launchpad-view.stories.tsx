import type { Launchpad } from "../server";
import { PreviewMatrix } from "./preview-gallery";
import { storyToday } from "./story-date";
import { TupleLaunchpadView } from "./tuple-launchpad-view";

export default {
  title: "Tuple/Out of call",
};

const noop = () => {};
const now = storyToday();

const richLaunchpad: Launchpad = {
  personalRoom: {
    slug: "stephen",
    joinUrl: "https://staging.tuple.app/c/stephen",
  },
  calls: [
    {
      id: "ongoing-1",
      participants: ["Demo teammate"],
      unknownParticipants: 0,
      capacity: 2,
      joinable: true,
      room: null,
      joinTarget: "demo@example.com",
    },
  ],
  history: [
    {
      callId: "recording-1",
      title: "Launch readiness review",
      summary: "Reviewed the rollout, chose the smaller launch, and assigned the remaining follow-ups.",
      startedAt: `${now}T20:15:00.000Z`,
      endedAt: `${now}T20:20:00.000Z`,
      participants: ["Demo host", "Example teammate"],
      promptContext: "Stored call one",
    },
    {
      callId: "recording-2",
      title: "Solo transcription test",
      summary: "A short solo recording used to exercise transcription capture.",
      startedAt: `${now}T16:35:00.000Z`,
      endedAt: `${now}T16:48:00.000Z`,
      participants: ["Demo host"],
      promptContext: "Stored call two",
    },
    {
      callId: "recording-3",
      title: null,
      summary: null,
      startedAt: `${now}T15:55:00.000Z`,
      endedAt: `${now}T16:15:00.000Z`,
      participants: ["Demo host", "Example teammate", "Test agent"],
      promptContext: "Stored call three",
    },
    {
      callId: "recording-4",
      title: "CLI and screen-sharing rehearsal",
      summary: "Exercised the CLI with a status request and a shared-screen capture.",
      startedAt: `${now}T15:29:00.000Z`,
      endedAt: `${now}T15:39:00.000Z`,
      participants: ["Demo host", "Test agent"],
      promptContext: "Stored call four",
    },
    {
      callId: "recording-5",
      title: "Integration smoke test",
      summary: "Exercised agent interaction and screen sharing. No durable follow-up was recorded.",
      startedAt: `${now}T14:30:00.000Z`,
      endedAt: `${now}T14:32:00.000Z`,
      participants: ["Demo host", "Test agent"],
      promptContext: "Stored call five",
    },
    {
      callId: "recording-6",
      title: "Untitled test capture",
      summary: "A synthetic empty capture with no durable knowledge or follow-up.",
      startedAt: `${now}T14:09:00.000Z`,
      endedAt: `${now}T14:15:00.000Z`,
      participants: ["Demo host"],
      promptContext: "Stored call six",
    },
    {
      callId: "recording-7",
      title: "Untitled test capture",
      summary: "A synthetic empty capture with no durable knowledge or follow-up.",
      startedAt: `${now}T13:51:00.000Z`,
      endedAt: `${now}T13:52:00.000Z`,
      participants: ["Demo host"],
      promptContext: "Stored call seven",
    },
    {
      callId: "recording-8",
      title: "Untitled test capture",
      summary: "A synthetic empty capture with no durable knowledge or follow-up.",
      startedAt: `${now}T13:15:00.000Z`,
      endedAt: `${now}T13:20:00.000Z`,
      participants: ["Demo host"],
      promptContext: "Stored call eight",
    },
  ],
};

const scenarios = [
  { label: "Full launchpad", launchpad: richLaunchpad },
  { label: "Personal room only", launchpad: { ...richLaunchpad, calls: [], history: [] } },
  { label: "History only", launchpad: { ...richLaunchpad, personalRoom: null, calls: [] } },
  { label: "Joining room", launchpad: richLaunchpad, joining: "room:stephen" },
  { label: "Loading", launchpad: null, loading: true },
  { label: "CLI unavailable", launchpad: null, error: "Tuple staging is not responding." },
] satisfies Array<{
  label: string;
  launchpad: Launchpad | null;
  joining?: string;
  loading?: boolean;
  error?: string;
}>;

export function StateMatrix() {
  return (
    <PreviewMatrix
      testId="launchpad-matrix"
      title="Tuple out-of-call state matrix"
      description="The room launcher, active calls, and recording history rendered together at every supported drawer width."
      scenarios={scenarios}
      autoHeight
      render={(scenario) => (
        <TupleLaunchpadView
          stateLoading={false}
          launchpad={scenario.launchpad}
          loading={scenario.loading ?? false}
          error={scenario.error ?? null}
          joining={scenario.joining ?? null}
          historyQuery=""
          historySearchResults={null}
          historySearchLoading={false}
          historySearchError={null}
          onRetry={noop}
          onRetryHistorySearch={noop}
          onHistoryQueryChange={noop}
          onJoin={noop}
          onSelectRecording={noop}
        />
      )}
    />
  );
}

const matchingCalls: Launchpad["history"] = [
  {
    ...richLaunchpad.history[0],
    matchKind: "spoken",
    matchSnippet: "We should [[demo]] the smaller launch first, then open it to the rest of the team.",
  },
  {
    ...richLaunchpad.history[3],
    matchKind: "content",
    matchSnippet: "Tuple launch [[demo]] checklist — owners, timing, and rollout notes",
  },
  {
    ...richLaunchpad.history[4],
    title: "Demo planning",
  },
];

const searchScenarios = [
  { label: "Matching calls", query: "demo", results: matchingCalls },
  { label: "Searching", query: "demo", results: null, loading: true },
  { label: "Keep typing", query: "ai", results: [] },
  { label: "No matches", query: "demo", results: [] },
  { label: "Search unavailable", query: "demo", results: null, error: "Tuple search unavailable" },
] satisfies Array<{
  label: string;
  query: string;
  results: Launchpad["history"] | null;
  loading?: boolean;
  error?: string;
}>;

export function SearchStates() {
  return (
    <PreviewMatrix
      testId="launchpad-search-matrix"
      title="Tuple call search state matrix"
      description="Full-history call search with matching excerpts, progress, empty results, and recovery."
      scenarios={searchScenarios}
      autoHeight
      render={(scenario) => (
        <TupleLaunchpadView
          stateLoading={false}
          launchpad={{ ...richLaunchpad, personalRoom: null, calls: [] }}
          loading={false}
          error={null}
          joining={null}
          historyQuery={scenario.query}
          historySearchResults={scenario.results}
          historySearchLoading={scenario.loading ?? false}
          historySearchError={scenario.error ?? null}
          onRetry={noop}
          onRetryHistorySearch={noop}
          onHistoryQueryChange={noop}
          onJoin={noop}
          onSelectRecording={noop}
        />
      )}
    />
  );
}
