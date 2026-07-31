import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { ApiError, askPlanetAI, checkHealth, type ChatTurn } from "../api";
import { suggestedQuestions } from "../data/issues";

type Status = "idle" | "thinking";
type Connection = "checking" | "online" | "unconfigured" | "offline";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  at: number;
}

const MAX_LENGTH = 1000;
const STORAGE_KEY = "lsop.chat.v1";

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "I am Planet AI. I only talk about the environment: climate, pollution, biodiversity, energy, oceans and everyday sustainability. Ask me something specific and I will give you numbers, not vibes.",
  at: 0,
};

const newId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const formatTime = (at: number): string =>
  at === 0 ? "" : new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Minimal, safe renderer for the light markdown Gemini tends to return. */
const renderInline = (text: string, keyPrefix: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) =>
    chunk.startsWith("**") && chunk.endsWith("**") && chunk.length > 4 ? (
      <strong key={`${keyPrefix}-${index}`}>{chunk.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${index}`}>{chunk}</span>
    )
  );

const RichText = ({ text }: { text: string }) => {
  const blocks = useMemo(() => text.trim().split(/\n{2,}/), [text]);

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim().length > 0);
        const isList = lines.length > 0 && lines.every((line) => /^\s*([-*]|\d+[.)])\s+/.test(line));

        if (isList) {
          return (
            <ul key={`b-${blockIndex}`} className="bubble__list">
              {lines.map((line, lineIndex) => (
                <li key={`b-${blockIndex}-${lineIndex}`}>
                  {renderInline(line.replace(/^\s*([-*]|\d+[.)])\s+/, ""), `i-${blockIndex}-${lineIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        return <p key={`b-${blockIndex}`}>{renderInline(block, `i-${blockIndex}`)}</p>;
      })}
    </>
  );
};

const loadStored = (): Message[] => {
  if (typeof window === "undefined") return [WELCOME];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw) as Message[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [WELCOME];
    return parsed;
  } catch {
    return [WELCOME];
  }
};

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>(loadStored);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>("checking");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQuestionRef = useRef<string>("");

  /* ---------------------------------------------------------------------- */
  /* Effects                                                                */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const controller = new AbortController();
    checkHealth(controller.signal)
      .then((health) => setConnection(health.geminiConfigured ? "online" : "unconfigured"))
      .catch(() => setConnection("offline"));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* storage full or blocked: history simply is not persisted */
    }
  }, [messages]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const autoGrow = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 168)}px`;
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Sending                                                                */
  /* ---------------------------------------------------------------------- */

  const send = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (question.length < 3 || status === "thinking") return;

      lastQuestionRef.current = question;
      setError(null);
      setDraft("");
      setStatus("thinking");

      const history: ChatTurn[] = messages
        .filter((message) => message.id !== "welcome")
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.content }));

      setMessages((current) => [
        ...current,
        { id: newId(), role: "user", content: question, at: Date.now() },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await askPlanetAI(question, history, controller.signal);
        setMessages((current) => [
          ...current,
          {
            id: newId(),
            role: "assistant",
            content: response.answer,
            sources: response.sources,
            at: Date.now(),
          },
        ]);
        setConnection("online");
      } catch (caught) {
        if (caught instanceof ApiError && caught.code === "cancelled") {
          setError(null);
        } else {
          setError(
            caught instanceof ApiError ? caught.message : "Something went wrong. Please try again."
          );
          if (caught instanceof ApiError && caught.code === "network_error") setConnection("offline");
          if (caught instanceof ApiError && caught.status === 503) setConnection("unconfigured");
        }
      } finally {
        abortRef.current = null;
        setStatus("idle");
        window.setTimeout(() => textareaRef.current?.focus(), 40);
      }
    },
    [messages, status]
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    }
  };

  const stop = () => abortRef.current?.abort();

  const reset = () => {
    abortRef.current?.abort();
    setMessages([WELCOME]);
    setError(null);
    setDraft("");
  };

  const retry = () => {
    if (!lastQuestionRef.current) return;
    setMessages((current) => {
      const trimmed = [...current];
      while (trimmed.length > 0 && trimmed[trimmed.length - 1]?.role === "user") trimmed.pop();
      return trimmed;
    });
    void send(lastQuestionRef.current);
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  const remaining = MAX_LENGTH - draft.length;
  const canSend = draft.trim().length >= 3 && status === "idle";
  const isFresh = messages.length <= 1;

  const connectionLabel: Record<Connection, string> = {
    checking: "connecting",
    online: "gemini-3.1-flash-lite",
    unconfigured: "API key missing",
    offline: "backend offline",
  };

  return (
    <section className="chat" id="planet-ai">
      <div className="chat__intro">
        <p className="eyebrow">
          <span className="eyebrow__dot" aria-hidden="true" />
          Planet AI
        </p>
        <h2 className="section-title">
          Ask the awkward
          <br />
          environmental question
        </h2>
        <p className="chat__lede">
          Planet AI runs on Google Gemini with this site&rsquo;s own knowledge base attached. It stays
          on six topics and refuses everything else, which is the point.
        </p>

        <ul className="chat__scope">
          {["ecology", "climate", "pollution", "sustainability", "biodiversity", "environment"].map(
            (topic) => (
              <li key={topic}>{topic}</li>
            )
          )}
        </ul>

        <div className={`chat__status chat__status--${connection}`}>
          <span className="chat__status-dot" aria-hidden="true" />
          {connectionLabel[connection]}
        </div>
      </div>

      <div className="chat__panel">
        <div className="chat__log" ref={scrollRef} role="log" aria-live="polite" aria-label="Conversation with Planet AI">
          {messages.map((message) => (
            <div key={message.id} className={`bubble bubble--${message.role}`}>
              <div className="bubble__meta">
                <span>{message.role === "user" ? "You" : "Planet AI"}</span>
                {message.at > 0 && <time>{formatTime(message.at)}</time>}
              </div>
              <div className="bubble__body">
                <RichText text={message.content} />
              </div>
              {message.sources && message.sources.length > 0 && (
                <p className="bubble__sources">
                  <span>Knowledge base</span> {message.sources.join(" \u00b7 ")}
                </p>
              )}
            </div>
          ))}

          {status === "thinking" && (
            <div className="bubble bubble--assistant bubble--thinking">
              <div className="bubble__meta">
                <span>Planet AI</span>
              </div>
              <div className="typing" aria-label="Planet AI is thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          {error && (
            <div className="chat__error" role="alert">
              <p>{error}</p>
              <button type="button" className="btn btn--sm btn--outline" onClick={retry}>
                Try again
              </button>
            </div>
          )}
        </div>

        {isFresh && (
          <div className="chat__suggestions">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                className="chip chip--suggestion"
                onClick={() => void send(question)}
                disabled={status === "thinking"}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        <form className="chat__form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="planet-ai-input">
            Your question for Planet AI
          </label>
          <textarea
            id="planet-ai-input"
            ref={textareaRef}
            className="chat__input"
            value={draft}
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder="e.g. How much CO2 does one long-haul flight really cost?"
            onChange={(event) => {
              setDraft(event.target.value);
              autoGrow();
            }}
            onKeyDown={onKeyDown}
            disabled={status === "thinking"}
          />

          <div className="chat__controls">
            <span className={`chat__counter${remaining < 80 ? " is-low" : ""}`}>
              {remaining} left
            </span>

            {!isFresh && (
              <button type="button" className="chat__ghost" onClick={reset} disabled={status === "thinking"}>
                Clear
              </button>
            )}

            {status === "thinking" ? (
              <button type="button" className="btn btn--sm btn--outline" onClick={stop}>
                Stop
              </button>
            ) : (
              <button type="submit" className="btn btn--sm btn--ink" disabled={!canSend}>
                Send
                <svg viewBox="0 0 20 20" className="btn__icon" aria-hidden="true">
                  <path d="M3.5 10h13M11 4.5l5.5 5.5L11 15.5" />
                </svg>
              </button>
            )}
          </div>
        </form>

        <p className="chat__disclaimer">
          Answers are generated and can be wrong. Check anything you plan to act on against the
          sources in the footer.
        </p>
      </div>
    </section>
  );
}
