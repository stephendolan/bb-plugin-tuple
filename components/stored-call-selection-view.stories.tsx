import { useState } from "react";
import { StoredCallSelectionView } from "./stored-call-selection-view";
import type { StoredCall } from "./tuple-launchpad-view";
import { PANEL_SURFACE_CLASS } from "./ui/panel-styles";

export default {
  title: "Tuple/Recorded call",
};

const noop = () => {};

const recordedCall: StoredCall = {
  callId: "recording-example",
  title: "Launch readiness review",
  summary: "Reviewed the rollout, chose the smaller launch, and assigned the remaining customer follow-ups.",
  startedAt: "2026-08-18T20:15:00.000Z",
  endedAt: "2026-08-18T20:20:00.000Z",
  participants: ["Demo host", "Example teammate"],
  promptContext: "Use synthetic stored call recording-example.",
};

const noSummaryCall: StoredCall = {
  ...recordedCall,
  callId: "recording-no-summary",
  title: null,
  summary: null,
  participants: ["Demo host", "Example teammate", "Test agent"],
};

interface PreviewProps {
  recording?: StoredCall;
  destination?: "current-thread" | "new-thread";
  initialTask?: string;
  sending?: boolean;
  instance: string;
}

function Preview({
  recording = recordedCall,
  destination = "current-thread",
  initialTask = "",
  sending = false,
  instance,
}: PreviewProps) {
  const [task, setTask] = useState(initialTask);
  return (
    <StoredCallSelectionView
      recording={recording}
      destination={destination}
      task={task}
      sending={sending}
      inputId={`recording-task-${instance}`}
      onBack={noop}
      onTaskChange={setTask}
      onSend={noop}
      newThreadComposer={
        <div className={`${PANEL_SURFACE_CLASS} p-3 text-sm text-muted-foreground`}>
          BB new-thread composer slot
        </div>
      }
    />
  );
}

const scenarios = [
  { label: "Current · empty" },
  { label: "Current · filled", initialTask: "Summarize the decision and draft the follow-up." },
  { label: "Current · sending", initialTask: "Summarize the decision.", sending: true },
  { label: "No summary", recording: noSummaryCall },
  { label: "New thread", destination: "new-thread" as const },
];

const widths = [280, 360, 480, 600] as const;

export function StateMatrix() {
  return (
    <main className="tuple-gallery" data-bb-plugin="tuple" data-testid="recorded-call-matrix">
      <header className="tuple-gallery-header">
        <h1>Tuple recorded-call state matrix</h1>
        <p>A selected historical call rendered for both destinations, with missing-content and submission states.</p>
      </header>
      <div className="tuple-gallery-grid">
        <div />
        {widths.map((width) => <div className="tuple-gallery-axis" key={width}>{width}px</div>)}
        {scenarios.map((scenario, scenarioIndex) => (
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
                <Preview {...scenario} instance={`${scenarioIndex}-${width}`} />
              </section>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
