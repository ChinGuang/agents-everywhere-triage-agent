"use client";

import { CopilotChat, useConfigureSuggestions } from "@copilotkit/react-core/v2";
import { Inbox } from "@/components/inbox";

export default function Home() {
  useConfigureSuggestions(
    {
      suggestions: [
        {
          title: "Triage the new messages",
          message:
            "Triage the new messages in the inbox. Classify each into feedback, bug, or question with a one-line summary, and show a Triage Card for each.",
        },
      ],
      available: "before-first-message",
    },
    [],
  );

  return (
    <main className="ck-workspace">
      <header className="ck-workspace-header">
        <div>
          <p className="ck-eyebrow">Agents, everywhere · Support triage</p>
          <h1>Telegram triage agent</h1>
          <p className="ck-intro">
            Customer messages arrive over Telegram. The agent triages each into feedback, bug, or
            question — right inside the inbox where support already works.
          </p>
        </div>
        <span className="ck-tag">CopilotKit + OpenAI</span>
      </header>

      <div className="ck-workspace-grid">
        <Inbox />

        <section className="ck-panel ck-assistant" aria-labelledby="assistant-title">
          <header className="ck-assistant-header">
            <h2 id="assistant-title">Ask assistant</h2>
            <p>It reads the inbox and triages messages into cards.</p>
          </header>
          <CopilotChat
            className="ck-chat"
            labels={{
              welcomeMessageText: "Ask me to “triage the new messages”.",
              chatInputPlaceholder: "e.g. triage the new messages",
            }}
          />
        </section>
      </div>
    </main>
  );
}
