import type { Launchpad } from "../server";
import { TupleLaunchpadView } from "./tuple-launchpad-view";

export default {
  title: "Tuple/Out of call",
};

const noop = () => {};
const now = "2026-08-18";

const richLaunchpad: Launchpad = {
  personalRoom: {
    slug: "stephen",
    joinUrl: "https://staging.tuple.app/c/stephen",
  },
  calls: [
    {
      id: "ongoing-1",
      participants: ["Monroe Dev account 1"],
      unknownParticipants: 0,
      capacity: 2,
      joinable: true,
      room: null,
      joinTarget: "monroe@example.com",
    },
  ],
  history: [
    {
      callId: "recording-1",
      title: "Product planning and customer follow-up",
      summary: "Reviewed the rollout, chose the smaller launch, and assigned the remaining customer follow-ups.",
      startedAt: `${now}T20:15:00.000Z`,
      endedAt: `${now}T20:20:00.000Z`,
      participants: ["Stephen Dolan", "Alexandria Montgomery-Smythe"],
      promptContext: "Stored call one",
    },
    {
      callId: "recording-2",
      title: "Solo transcription test",
      summary: "A short solo recording used to exercise transcription capture.",
      startedAt: `${now}T16:35:00.000Z`,
      endedAt: `${now}T16:48:00.000Z`,
      participants: ["Stephen Dolan"],
      promptContext: "Stored call two",
    },
    {
      callId: "recording-3",
      title: null,
      summary: null,
      startedAt: `${now}T15:55:00.000Z`,
      endedAt: `${now}T16:15:00.000Z`,
      participants: ["Jonathan MainWindows", "Sherlock", "Stephen Dolan"],
      promptContext: "Stored call three",
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

const widths = [280, 360, 480] as const;

export function StateMatrix() {
  return (
    <main className="tuple-gallery" data-bb-plugin="tuple" data-testid="launchpad-matrix">
      <header className="tuple-gallery-header">
        <h1>Tuple out-of-call state matrix</h1>
        <p>The room launcher, active calls, and recording history rendered together at every supported drawer width.</p>
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
                <TupleLaunchpadView
                  stateLoading={false}
                  launchpad={scenario.launchpad}
                  loading={scenario.loading ?? false}
                  error={scenario.error ?? null}
                  joining={scenario.joining ?? null}
                  onRetry={noop}
                  onJoin={noop}
                  onSelectRecording={noop}
                />
              </section>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
