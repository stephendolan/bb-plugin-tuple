import { useState } from "react";
import type { CallState } from "../server";
import {
  ThreadCallPanelView,
  currentThreadCallComposerCopy,
  type ThreadCallComposerCopy,
} from "./thread-call-panel-view";
import { PreviewGallery, PreviewMatrix, PreviewPanel } from "./preview-gallery";

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

export function StateMatrix() {
  return (
    <PreviewMatrix
      testId="state-matrix"
      title="Tuple thread drawer state matrix"
      description="Production components rendered at the drawer widths most likely to expose wrapping, clipping, and hierarchy defects."
      scenarios={scenarios}
      render={(scenario, width, scenarioIndex) => (
        <Preview
          state={scenario.state}
          initialTask={scenario.initialTask}
          sending={scenario.sending}
          instance={`${scenarioIndex}-${width}`}
        />
      )}
    />
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
    <PreviewGallery
      testId="composer-copy"
      title="Composer copy options"
      description="Each option uses the exact production form component; only the words change."
    >
      <div className="tuple-copy-options">
        {copyOptions.map((option, index) => (
          <section className="tuple-copy-option" key={option.label}>
            <h2>{option.label}</h2>
            <PreviewPanel width={360}>
              <Preview state={liveCall} copy={option.copy} instance={`copy-${index}`} />
            </PreviewPanel>
          </section>
        ))}
      </div>
    </PreviewGallery>
  );
}
