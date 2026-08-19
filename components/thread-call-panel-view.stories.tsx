import { useState } from "react";
import type { CallState } from "../server";
import {
  ThreadCallPanelView,
  currentThreadCallComposerCopy,
  type ThreadCallComposerCopy,
} from "./thread-call-panel-view";

export default {
  title: "Tuple/Thread drawer",
};

const noop = () => {};

const liveCall: CallState = {
  environment: "staging",
  inCall: true,
  call: {
    callId: "call-story",
    muted: false,
    transcribing: true,
    roomSlug: "personal-room",
    roomName: "Demo room",
    roomKind: "personal",
    joinUrl: "https://staging.tuple.app/c/personal-room",
    participants: [],
  },
  connection: "connected",
  error: null,
  updatedAt: "2026-08-18T20:00:00.000Z",
};

const longIdentityCall: CallState = {
  ...liveCall,
  call: {
    ...liveCall.call!,
    roomKind: "team",
    roomName: "Infrastructure planning and reliability review",
    participants: ["An Intentionally Long Example Participant Name"],
  },
};

interface PreviewProps {
  state: CallState;
  initialTask?: string;
  sending?: boolean;
  copy?: ThreadCallComposerCopy;
  instance: string;
}

function Preview({
  state,
  initialTask = "",
  sending = false,
  copy,
  instance,
}: PreviewProps) {
  const [task, setTask] = useState(initialTask);
  return (
    <ThreadCallPanelView
      state={state}
      minutes={5}
      task={task}
      sending={sending}
      copy={copy}
      inputId={`tuple-task-${instance}`}
      onTaskChange={setTask}
      onSend={noop}
      onRetry={noop}
      onCopyJoinLink={noop}
      onStartTranscription={noop}
    />
  );
}

const scenarios = [
  { label: "Live · empty", state: liveCall },
  { label: "Live · filled", state: liveCall, initialTask: "Capture the decision and draft the follow-up." },
  { label: "Sending", state: liveCall, initialTask: "Summarize the decision.", sending: true },
  { label: "Transcription off", state: { ...liveCall, call: { ...liveCall.call!, transcribing: false } } },
  { label: "Long identity", state: longIdentityCall },
  { label: "No join link", state: { ...liveCall, call: { ...liveCall.call!, joinUrl: null } } },
] satisfies Array<{
  label: string;
  state: CallState;
  initialTask?: string;
  sending?: boolean;
}>;

const widths = [280, 360, 480, 600] as const;

export function StateMatrix() {
  return (
    <main className="tuple-gallery" data-bb-plugin="tuple" data-testid="state-matrix">
      <header className="tuple-gallery-header">
        <h1>Tuple thread drawer state matrix</h1>
        <p>Production components rendered at the drawer widths most likely to expose wrapping, clipping, and hierarchy defects.</p>
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
                className="tuple-gallery-panel"
                data-panel
                data-state={scenario.label}
                data-width={width}
                style={{ width }}
              >
                <Preview
                  state={scenario.state}
                  initialTask={scenario.initialTask}
                  sending={scenario.sending}
                  instance={`${scenarioIndex}-${width}`}
                />
              </section>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

const copyOptions: Array<{ label: string; copy: ThreadCallComposerCopy }> = [
  { label: "Sentence completion · current", copy: currentThreadCallComposerCopy },
  {
    label: "Direct question",
    copy: {
      label: "What should the thread do with this call?",
      placeholder: "Summarize decisions and suggest next steps",
      action: "Send {minutes} min of transcript",
    },
  },
  {
    label: "Explicit task",
    copy: {
      label: "Task for the current thread",
      placeholder: "Summarize decisions and suggest next steps",
      action: "Send {minutes} min of transcript",
    },
  },
];

export function ComposerCopy() {
  return (
    <main className="tuple-gallery" data-bb-plugin="tuple" data-testid="composer-copy">
      <header className="tuple-gallery-header">
        <h1>Composer copy options</h1>
        <p>Each option uses the exact production form component; only the words change.</p>
      </header>
      <div className="tuple-copy-options">
        {copyOptions.map((option, index) => (
          <section className="tuple-copy-option" key={option.label}>
            <h2>{option.label}</h2>
            <div className="tuple-gallery-panel" data-panel style={{ width: 360 }}>
              <Preview state={liveCall} copy={option.copy} instance={`copy-${index}`} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
