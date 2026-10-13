import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { experimental_defineHostEntry } from "@get-bb/plugin-sdk";
import { hostContract, hostSignals } from "./host-contract";

const execFileAsync = promisify(execFile);

function cliError(command: string, error: unknown) {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    return new Error(
      `Tuple CLI "${command}" was not found on PATH. Install it, or set Tuple machine to the machine that runs Tuple.`,
    );
  }
  return error;
}

export default experimental_defineHostEntry({
  contract: hostContract,
  experimental_signals: hostSignals,
  handlers: {
    async run({ command, args, timeoutMs, maxBuffer }, context) {
      try {
        const { stdout } = await execFileAsync(command, args, {
          timeout: timeoutMs,
          maxBuffer,
          signal: context.signal,
        });
        return { stdout };
      } catch (error) {
        throw cliError(command, error);
      }
    },

    async followState({ command, followId, durationMs }, context) {
      context.signal.throwIfAborted();
      const child = spawn(command, ["--format", "json", "state", "follow"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      let emitting = Promise.resolve();
      let expired = false;

      const stop = () => child.kill("SIGTERM");
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
        const lines = stdout.split("\n");
        stdout = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          emitting = emitting
            .then(() => context.experimental_emitSignal("state", { followId, line }))
            .catch((error: unknown) => {
              stop();
              throw error;
            });
        }
      });
      child.stderr.on("data", (chunk: string) => {
        stderr = `${stderr}${chunk}`.slice(-4_000);
      });

      const expiry = setTimeout(() => {
        expired = true;
        stop();
      }, durationMs);
      context.signal.addEventListener("abort", stop, { once: true });
      try {
        const exitCode = await new Promise<number | null>((resolve, reject) => {
          child.once("error", reject);
          child.once("close", resolve);
        });
        await emitting;
        context.signal.throwIfAborted();
        if (expired) return { ended: "expired" as const };
        if (exitCode !== 0) {
          throw new Error(stderr.trim() || `Tuple state follower exited with code ${exitCode}`);
        }
        return { ended: "exited" as const };
      } catch (error) {
        throw cliError(command, error);
      } finally {
        clearTimeout(expiry);
        context.signal.removeEventListener("abort", stop);
      }
    },
  },
});
