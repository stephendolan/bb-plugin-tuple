import { useState } from "react";
import { StoredCallSelectionView } from "./stored-call-selection-view";
import type { StoredCall } from "./recent-calls-section";
import { PreviewMatrix } from "./preview-gallery";
import { storyTodayAt } from "./story-date";
import { PANEL_SURFACE_CLASS } from "./ui/panel-styles";

export default {
  title: "Tuple/Recorded call",
};

const noop = () => {};

const recordedCall: StoredCall = {
  callId: "recording-example",
  title: "Launch readiness review",
  summary: "Reviewed the rollout, chose the smaller launch, and assigned the remaining customer follow-ups.",
  startedAt: storyTodayAt("16:15:00.000"),
  endedAt: storyTodayAt("16:20:00.000"),
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

export function StateMatrix() {
  return (
    <PreviewMatrix
      testId="recorded-call-matrix"
      title="Tuple recorded-call state matrix"
      description="A selected historical call rendered for both destinations, with missing-content and submission states."
      scenarios={scenarios}
      autoHeight
      render={(scenario, width, scenarioIndex) => (
        <Preview {...scenario} instance={`${scenarioIndex}-${width}`} />
      )}
    />
  );
}
