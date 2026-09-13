import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { resolveModel } from "./model";
import { SYSTEM_PROMPT } from "./prompt";

/**
 * The agent factory.
 *
 * Return a FRESH agent per threadId — never share one stateful instance across
 * conversations. Channels clones the agent per turn anyway, but a factory is the
 * documented shape and keeps per-thread state honest.
 *
 * To swap in LangGraph, CrewAI, Mastra, Pydantic AI, or Google ADK, replace the
 * body with an HttpAgent pointed at your agent's AG-UI endpoint:
 *
 *   import { HttpAgent } from "@ag-ui/client";
 *   return new HttpAgent({ url: process.env.AGENT_URL! });
 *
 * Nothing else in the kit changes. That is the point of AG-UI.
 */
export type AgentFactoryOptions = {
  /** Override the default prompt for a surface-specific starter. */
  prompt?: string;
};

export function makeAgent(threadId: string, options: AgentFactoryOptions = {}) {
  const agent = new BuiltInAgent({
    model: resolveModel(),
    prompt: options.prompt ?? SYSTEM_PROMPT,

    // NOT optional in practice. maxSteps defaults to 1, which means the agent
    // can call one tool and then stops — before it ever sees the result. The
    // triage agent needs room to read the inbox and call triage_message per
    // message, so give it several steps.
    maxSteps: 10,
  });
  agent.threadId = threadId;
  return agent;
}
