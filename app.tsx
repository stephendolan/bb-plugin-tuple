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
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { CallOverview, ThreadCallPanelView } from "@/components/thread-call-panel-view";
import {
  TupleLaunchpadView,
  storedCallTime,
  storedCallTitle,
  type StoredCall,
} from "@/components/tuple-launchpad-view";

const tupleCompactIconUrl = "/api/v1/plugins/tuple/assets/icon";

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

function TupleStatusIcon({ state }: { state: CallState | null }) {
  const mask = `url("${tupleCompactIconUrl}")`;
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
      <span
        className="size-4 bg-current"
        style={{
          maskImage: mask,
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskImage: mask,
          WebkitMaskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
        }}
      />
      {state?.inCall ? (
        <span className="absolute right-0 bottom-0 size-1.5 rounded-full bg-emerald-500 ring-1 ring-background" />
      ) : null}
    </span>
  );
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
    <section className="space-y-5">
      <header className="flex items-start gap-3">
        <Button type="button" size="icon" variant="ghost" className="relative size-8 shrink-0" aria-label="Back to Tuple calls" onClick={onBack}>
          <span className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true" />
          <Icon name="ChevronLeft" className="size-4" aria-hidden="true" />
        </Button>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="truncate font-semibold">{storedCallTitle(recording)}</h2>
          <p className="text-sm text-muted-foreground">{storedCallTime(recording)}</p>
        </div>
      </header>

      {recording.summary ? <p className="text-sm text-foreground/85">{recording.summary}</p> : null}

      <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
        The receiving agent will read this recording directly from Tuple. The transcript is not copied into the thread draft.
      </div>

      {threadId ? (
        <form className="space-y-2.5" onSubmit={(event) => { event.preventDefault(); void sendToThread(); }}>
          <label className="font-medium" htmlFor={`tuple-recording-task-${recording.callId}`}>Purpose</label>
          <Input
            id={`tuple-recording-task-${recording.callId}`}
            value={task}
            onChange={(event) => setTask(event.target.value)}
            placeholder="Summarize decisions and identify follow-ups"
          />
          <Button type="submit" className="w-full" disabled={!task.trim() || sending}>
            <Icon name={sending ? "Spinner" : "Sent"} className={`size-4 ${sending ? "animate-spin" : ""}`} aria-hidden="true" />
            {sending ? "Sending…" : "Send call to current thread"}
          </Button>
        </form>
      ) : (
        <NewThreadComposer
          defaultProjectId={projectId ?? undefined}
          initialPrompt={recording.promptContext}
          draftKey={`tuple-recording-${recording.callId}`}
          onSubmit={createThread}
        />
      )}
    </section>
  );
}

function SnapshotPreview({
  snapshot,
  capturing,
  onRecapture,
}: {
  snapshot: TranscriptSnapshot;
  capturing: boolean;
  onRecapture: () => void;
}) {
  return (
    <section className="space-y-3 border-t border-foreground/8 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-balance font-semibold">Recent conversation</h2>
          <p className="text-pretty text-base text-muted-foreground sm:text-sm">
            {snapshot.segmentCount} speech segment{snapshot.segmentCount === 1 ? "" : "s"} from the last {snapshot.minutes} minutes
            {snapshot.truncated ? " · Oldest text trimmed" : ""}.
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="relative size-8 shrink-0"
          disabled={capturing}
          aria-label="Recapture the latest conversation"
          onClick={onRecapture}
        >
          <span className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true" />
          <Icon name={capturing ? "Spinner" : "RotateCcw"} className={`size-4 shrink-0 ${capturing ? "animate-spin" : ""}`} aria-hidden="true" />
        </Button>
      </div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/45 p-3 text-sm text-foreground/85 ring-1 ring-foreground/8">
        {snapshot.transcript || "No speech was captured in this window."}
      </pre>
    </section>
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
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <CallOverview
          state={state}
          loading={loading}
          onRetry={() => void refresh()}
          onCopyJoinLink={() => void copyCallJoinLink(state)}
          onStartTranscription={() => void startTranscription()}
        />
        {!snapshot ? (
          <section className="flex flex-col items-start gap-4 border-t border-foreground/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-balance font-semibold">Start a thread from this conversation</h2>
              <p className="max-w-[65ch] text-pretty text-base text-muted-foreground sm:text-sm">
                Review the recent transcript, then tell the new thread what to do with it.
              </p>
            </div>
            <Button
              type="button"
              className="shrink-0 pl-2 pr-3"
              disabled={!state?.call?.transcribing || capturing}
              onClick={() => void capture()}
            >
              {capturing ? (
                <Icon name="Spinner" className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <Icon name="BubbleChatQuestion" className="size-4 shrink-0" aria-hidden="true" />
              )}
              {capturing ? "Capturing…" : `Use last ${minutes} minutes`}
            </Button>
          </section>
        ) : (
          <>
            <SnapshotPreview snapshot={snapshot} capturing={capturing} onRecapture={() => void capture()} />
            <section className="space-y-3 border-t border-foreground/8 pt-5">
              <div>
                <h2 className="text-balance font-semibold">Start a new thread</h2>
                <p className="text-pretty text-base text-muted-foreground sm:text-sm">
                  The transcript is already in the draft. Add your task, choose how the thread should run, and send.
                </p>
              </div>
              <NewThreadComposer
                defaultProjectId={projectId ?? undefined}
                initialPrompt={snapshot.promptContext}
                draftKey={`tuple-call-${snapshot.callId}-${snapshot.capturedAt}`}
                onSubmit={createThread}
              />
            </section>
          </>
        )}
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
  if (!state?.inCall) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`size-1.5 shrink-0 rounded-full ${state.call?.transcribing ? "bg-emerald-500" : "bg-amber-400"}`} />
      {state.call?.transcribing ? "Live" : "In call"}
    </div>
  );
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

  const label = !state?.inCall
    ? "Open Tuple"
    : state.call?.transcribing
      ? `Add the last ${values?.defaultMinutes ?? "5"} minutes of this Tuple call to the draft`
      : "Start Tuple transcription";
  return (
    <button
      type="button"
      className="focus-visible:outline-ring hover:bg-accent hover:text-foreground text-muted-foreground relative flex size-8 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
      disabled={loading}
      aria-label={label}
      title={label}
      onClick={() => void runAction()}
    >
      <span className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true" />
      {loading ? (
        <Icon name="Spinner" className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <TupleStatusIcon state={state} />
      )}
    </button>
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
