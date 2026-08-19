import { useCallback, useEffect, useState } from "react";
import {
  definePluginApp,
  experimental_NewThreadComposer as NewThreadComposer,
  useBbContext,
  useBbNavigate,
  useComposer,
  useRealtime,
  useRpc,
  useSettings,
  type NewThreadRequest,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { CallState, Launchpad, TranscriptSnapshot, rpcContract } from "./server";
import { ThreadCallPanelView } from "@/components/thread-call-panel-view";
import {
  TupleLaunchpadView,
  type StoredCall,
} from "@/components/tuple-launchpad-view";
import { StoredCallSelectionView } from "@/components/stored-call-selection-view";
import { NewCallThreadView } from "@/components/new-call-thread-view";
import { TupleComposerActionButton, TupleSidebarAccessory } from "@/components/tuple-slot-view";

async function copyCallJoinLink(state: CallState | null) {
  const joinUrl = state?.call?.joinUrl;
  if (!joinUrl) return;
  try {
    await navigator.clipboard.writeText(joinUrl);
    toast.success("Join link copied.");
  } catch {
    toast.error("Could not copy the join link.");
  }
}

function useCallState() {
  const rpc = useRpc<typeof rpcContract>();
  const [state, setState] = useState<CallState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setState(await rpc.call("getState"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reach Tuple.");
    } finally {
      setLoading(false);
    }
  }, [rpc]);

  const startTranscription = useCallback(async () => {
    try {
      setState(await rpc.call("startTranscription"));
      toast.success("Transcription started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start transcription.");
    }
  }, [rpc]);

  useEffect(() => void refresh(), [refresh]);
  useRealtime("call-state", (next) => setState(next as CallState));
  return { state, loading, refresh, startTranscription, rpc };
}

function useTupleLaunchpad(enabled: boolean) {
  const rpc = useRpc<typeof rpcContract>();
  const [launchpad, setLaunchpad] = useState<Launchpad | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLaunchpad(await rpc.call("getLaunchpad"));
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load Tuple rooms.");
    } finally {
      setLoading(false);
    }
  }, [enabled, rpc]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(interval);
  }, [enabled, refresh]);

  return { launchpad, loading, error, refresh, rpc };
}

function TupleLaunchpad({
  state,
  loading: stateLoading,
  onSelectRecording,
}: {
  state: CallState | null;
  loading: boolean;
  onSelectRecording: (recording: StoredCall) => void;
}) {
  const enabled = !stateLoading && !state?.inCall;
  const { launchpad, loading, error, refresh, rpc } = useTupleLaunchpad(enabled);
  const [joining, setJoining] = useState<string | null>(null);

  async function join(target: string, id: string, copyUrl?: string) {
    setJoining(id);
    try {
      await rpc.call("joinTuple", { target, switchCurrent: false });
      if (!copyUrl) {
        toast.success("Joining Tuple call…");
        return;
      }
      try {
        await navigator.clipboard.writeText(copyUrl);
        toast.success("Entering your room · link copied.");
      } catch {
        toast.warning("Entering your room, but the link could not be copied.");
      }
    } catch (joinError) {
      toast.error(joinError instanceof Error ? joinError.message : "Could not join the Tuple call.");
    } finally {
      setJoining(null);
    }
  }

  return (
    <TupleLaunchpadView
      stateLoading={stateLoading}
      launchpad={launchpad}
      loading={loading}
      error={error}
      joining={joining}
      onRetry={() => void refresh()}
      onJoin={(target, id, copyUrl) => void join(target, id, copyUrl)}
      onSelectRecording={onSelectRecording}
    />
  );
}

function StoredCallSelection({
  recording,
  projectId,
  threadId,
  onBack,
}: {
  recording: StoredCall;
  projectId?: string | null;
  threadId?: string;
  onBack: () => void;
}) {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
  const [task, setTask] = useState("");
  const [sending, setSending] = useState(false);

  async function createThread(request: NewThreadRequest) {
    const result = await rpc.call("createThread", { request });
    navigate.toThread(result.threadId);
  }

  async function sendToThread() {
    if (!threadId || !task.trim()) return;
    setSending(true);
    try {
      await rpc.call("sendRecordingToThread", { threadId, callId: recording.callId, task });
      setTask("");
      toast.success("Sent the Tuple call to the current thread.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the Tuple call.");
    } finally {
      setSending(false);
    }
  }

  return (
    <StoredCallSelectionView
      recording={recording}
      destination={threadId ? "current-thread" : "new-thread"}
      task={task}
      sending={sending}
      onBack={onBack}
      onTaskChange={setTask}
      onSend={() => void sendToThread()}
      newThreadComposer={
        <NewThreadComposer
          defaultProjectId={projectId ?? undefined}
          initialPrompt={recording.promptContext}
          draftKey={`tuple-recording-${recording.callId}`}
          onSubmit={createThread}
        />
      }
    />
  );
}

function NewCallThread({ projectId }: { projectId: string | null }) {
  const { state, loading, refresh, startTranscription, rpc } = useCallState();
  const navigate = useBbNavigate();
  const { values } = useSettings();
  const minutes = Number(values?.defaultMinutes ?? "5");
  const [snapshot, setSnapshot] = useState<TranscriptSnapshot | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<StoredCall | null>(null);

  async function capture() {
    setCapturing(true);
    try {
      setSnapshot(await rpc.call("getSnapshot", { minutes }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not capture the conversation.");
    } finally {
      setCapturing(false);
    }
  }

  async function createThread(request: NewThreadRequest) {
    const result = await rpc.call("createThread", { request });
    navigate.toThread(result.threadId);
  }

  if (!state?.inCall) {
    return (
      <main className="isolate h-full overflow-auto p-4 antialiased md:p-5">
        <div className="mx-auto w-full max-w-3xl">
          {selectedRecording ? (
            <StoredCallSelection recording={selectedRecording} projectId={projectId} onBack={() => setSelectedRecording(null)} />
          ) : (
            <TupleLaunchpad state={state} loading={loading} onSelectRecording={setSelectedRecording} />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="isolate h-full overflow-auto p-4 antialiased md:p-5">
      <div className="mx-auto w-full max-w-3xl">
        <NewCallThreadView
          state={state}
          loading={loading}
          minutes={minutes}
          snapshot={snapshot}
          capturing={capturing}
          onRetry={() => void refresh()}
          onCopyJoinLink={() => void copyCallJoinLink(state)}
          onStartTranscription={() => void startTranscription()}
          onCapture={() => void capture()}
          newThreadComposer={snapshot ? (
            <NewThreadComposer
              defaultProjectId={projectId ?? undefined}
              initialPrompt={snapshot.promptContext}
              draftKey={`tuple-call-${snapshot.callId}-${snapshot.capturedAt}`}
              onSubmit={createThread}
            />
          ) : undefined}
        />
      </div>
    </main>
  );
}

function ThreadCallPanel({ threadId }: { threadId: string }) {
  const { state, loading, refresh, startTranscription, rpc } = useCallState();
  const { values } = useSettings();
  const minutes = Number(values?.defaultMinutes ?? "5");
  const [task, setTask] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<StoredCall | null>(null);

  async function send() {
    if (!task.trim()) return;
    setSending(true);
    try {
      await rpc.call("sendToThread", { threadId, minutes, task });
      setTask("");
      toast.success("Sent to the current thread with Tuple context.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send Tuple context.");
    } finally {
      setSending(false);
    }
  }

  if (!state?.inCall) {
    return selectedRecording ? (
      <StoredCallSelection recording={selectedRecording} threadId={threadId} onBack={() => setSelectedRecording(null)} />
    ) : (
      <TupleLaunchpad state={state} loading={loading} onSelectRecording={setSelectedRecording} />
    );
  }

  return (
    <ThreadCallPanelView
      state={state}
      loading={loading}
      minutes={minutes}
      task={task}
      sending={sending}
      onTaskChange={setTask}
      onSend={() => void send()}
      onRetry={() => void refresh()}
      onCopyJoinLink={() => void copyCallJoinLink(state)}
      onStartTranscription={() => void startTranscription()}
    />
  );
}

function SidebarAccessory() {
  const { state } = useCallState();
  return <TupleSidebarAccessory state={state} />;
}

function NavCallThread() {
  const { projectId } = useBbContext();
  return <NewCallThread projectId={projectId} />;
}

function ComposerTupleAction() {
  const { state, rpc, startTranscription } = useCallState();
  const composer = useComposer();
  const navigate = useBbNavigate();
  const { values } = useSettings();
  const [loading, setLoading] = useState(false);

  async function runAction() {
    if (!state?.inCall) {
      const opened = navigate.openThreadPanel({ actionId: "call", title: "Tuple" });
      if (!opened) navigate.toPluginPanel("call");
      return;
    }

    setLoading(true);
    try {
      if (!state?.call?.transcribing) {
        await startTranscription();
        return;
      }
      const minutes = Number(values?.defaultMinutes ?? "5");
      const snapshot = await rpc.call("getSnapshot", { minutes });
      composer.updateText((current) => `${current}${current ? "\n\n" : ""}${snapshot.promptContext}`);
      composer.focus();
      toast.success("Added recent Tuple context to your draft.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add Tuple context.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <TupleComposerActionButton
      state={state}
      loading={loading}
      minutes={Number(values?.defaultMinutes ?? "5")}
      onAction={() => void runAction()}
    />
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "call",
    title: "Tuple",
    icon: "VideoCamera",
    path: "call",
    component: NavCallThread,
    experimental_sidebarAccessory: SidebarAccessory,
  });
  app.slots.threadPanelAction({
    id: "call",
    title: "Tuple",
    icon: "VideoCamera",
    component: ThreadCallPanel,
  });
  app.slots.experimental_newThreadPanelAction({
    id: "call",
    title: "Start from Tuple call",
    icon: "VideoCamera",
    layout: "flush",
    component: ({ projectId }) => <NewCallThread projectId={projectId} />,
  });
  app.composer.customize({
    id: "tuple-context",
    actions: [{ id: "recent-call", component: ComposerTupleAction }],
  });
});
