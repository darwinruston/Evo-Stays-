"use client";

import { useState, useTransition } from "react";
import { button, card } from "@/lib/ui";
import {
  BUSINESS_TYPE_LABELS,
  MODULE_LABELS,
  QUESTIONS,
  modulesFromAnswers,
  parseAnswers,
  type Answers,
  type QuestionKey,
} from "@/lib/onboarding";

// One question at a time with preset answers: tapping an answer records it
// and moves straight on. The last screen reads the choices back in plain
// words before anything is saved.
export function OnboardingWizard({
  companyName,
  finishAction,
  skipAction,
}: {
  companyName: string;
  finishAction: (answers: Answers) => Promise<void>;
  skipAction: () => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, string>>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = QUESTIONS.length;
  const reviewing = step >= total;
  const question = reviewing ? null : QUESTIONS[step];

  function choose(key: QuestionKey, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
    setStep((s) => s + 1);
  }

  function finish() {
    const parsed = parseAnswers(answers);
    if (!parsed) {
      setError("Something's missing. Go back and check each question has an answer.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await finishAction(parsed);
      } catch (err) {
        // A redirect on success isn't an error; anything else is shown.
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) setError(err.message);
      }
    });
  }

  function skip() {
    startTransition(async () => {
      try {
        await skipAction();
      } catch (err) {
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) setError(err.message);
      }
    });
  }

  const parsed = reviewing ? parseAnswers(answers) : null;
  const modules = parsed ? modulesFromAnswers(parsed) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-zinc-500">Welcome, {companyName}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10" aria-hidden>
            <div
              className="h-full rounded-full bg-zinc-900 transition-all"
              style={{ width: `${(Math.min(step, total) / total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500">
            {reviewing ? "Done" : `${step + 1} of ${total}`}
          </span>
        </div>
      </div>

      {question && (
        <section className="flex flex-col gap-4" aria-live="polite">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{question.title}</h1>
            {question.hint && <p className="mt-1.5 text-sm text-zinc-500">{question.hint}</p>}
          </div>
          <ul className="flex flex-col gap-2">
            {question.options.map((option) => {
              const selected = answers[question.key] === option.value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => choose(question.key, option.value)}
                    aria-pressed={selected}
                    className={card(
                      `flex w-full flex-col gap-0.5 p-4 text-left transition-colors hover:bg-black/[0.02] ${
                        selected ? "ring-2 ring-zinc-900" : ""
                      }`,
                    )}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-sm text-zinc-500">{option.description}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {reviewing && (
        <section className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Here&apos;s how we&apos;ve set you up</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              {parsed ? `You told us you're a ${BUSINESS_TYPE_LABELS[parsed.businessType].toLowerCase()}. ` : ""}
              You can change any of this later in Settings.
            </p>
          </div>
          {modules ? (
            <ul className={card("divide-y divide-black/5 px-4")}>
              {(Object.keys(MODULE_LABELS) as (keyof typeof MODULE_LABELS)[]).map((key) => (
                <li key={key} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{MODULE_LABELS[key].name}</p>
                    <p className="text-sm text-zinc-500">
                      {modules[key] ? MODULE_LABELS[key].on : MODULE_LABELS[key].off}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      modules[key] ? "bg-zinc-900 text-white" : "bg-black/[0.05] text-zinc-600"
                    }`}
                  >
                    {modules[key] ? "On" : "Off"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600">Go back and answer each question.</p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={finish}
            disabled={pending || !modules}
            className={`w-full ${button("primary", "lg")}`}
          >
            {pending ? "Setting up…" : "Looks good, finish setup"}
          </button>
        </section>
      )}

      <div className="flex items-center justify-between text-sm">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={pending}
            className="text-zinc-500 hover:text-zinc-900"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={skip}
          disabled={pending}
          className="text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
        >
          Skip setup, give me everything
        </button>
      </div>
      {!reviewing && error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
