import { defineRpcContract, type ExperimentalHostSignals } from "@get-bb/plugin-sdk";
import { z } from "zod";

// Host RPC output is capped at 8 MiB of JSON; leave room for escaping stdout.
export const MAX_CLI_OUTPUT_BYTES = 6 * 1024 * 1024;

export const hostContract = defineRpcContract({
  run: {
    input: z
      .object({
        command: z.string().min(1),
        args: z.array(z.string()),
        timeoutMs: z.number().int().positive(),
        maxBuffer: z.number().int().positive().max(MAX_CLI_OUTPUT_BYTES),
      })
      .strict(),
    output: z.object({ stdout: z.string() }).strict(),
  },
  followState: {
    input: z
      .object({
        command: z.string().min(1),
        followId: z.string().min(1),
        durationMs: z.number().int().positive(),
      })
      .strict(),
    output: z.object({ ended: z.enum(["expired", "exited"]) }).strict(),
  },
});

export const hostSignals = {
  state: {
    payload: z.object({ followId: z.string().min(1), line: z.string().min(1) }).strict(),
  },
} satisfies ExperimentalHostSignals;
