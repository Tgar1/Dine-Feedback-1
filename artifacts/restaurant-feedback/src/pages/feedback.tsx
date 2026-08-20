import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useLocation } from "wouter";
import { useCreateFeedback } from "@workspace/api-client-react";
import type { FeedbackInput } from "@workspace/api-client-react";
import { questionFlow, Question } from "../lib/question-flow";

function getLocationFromQr() {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("location");
  return value?.trim() || null;
}

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" data-testid="brand-mark">
      <span className="grid size-9 place-items-center rounded-full bg-[#CCFF00] text-[#1B4D3E] shadow-[0_5px_14px_rgba(27,77,62,.12)]">
        <span className="h-4 w-4 rounded-full border-[1.5px] border-[#1B4D3E] border-dashed" />
      </span>
      <span
        className={`font-serif text-[1.15rem] font-semibold tracking-[-0.03em] ${inverse ? "text-[#FFFFFF]" : "text-[#1B4D3E]"
          }`}
      >
        ReRu
      </span>
    </div>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div
      className="mb-8 flex items-center gap-2"
      aria-label={`Step ${step} of ${total}`}
      data-testid="progress-feedback"
    >
      {Array.from({ length: total }, (_, i) => i + 1).map((item) => (
        <div key={item} className="flex items-center gap-2">
          <span
            className={`grid size-6 place-items-center rounded-full text-[11px] font-bold transition-colors ${item <= step
              ? "bg-[#1A1A1A] text-[#FFFFFF]"
              : "bg-[#E4E1D9] text-[#77766F]"
              }`}
            aria-current={item === step ? "step" : undefined}
          >
            {item < step ? <Check size={13} strokeWidth={3} /> : item}
          </span>
          {item < total && (
            <span
              className={`h-px w-8 transition-colors sm:w-12 ${item < step ? "bg-[#1A1A1A]" : "bg-[#D8D5CD]"
                }`}
            />
          )}
        </div>
      ))}
      <span className="ml-1 font-mono text-[10px] uppercase tracking-[.15em] text-[#77766F]">
        under a minute
      </span>
    </div>
  );
}

function QuestionStep({
  question,
  value,
  onAnswer,
  stepNumber,
  onContinue,
  isFinalStep,
}: {
  question: Question;
  value: string | null;
  onAnswer: (value: string, next?: string | null) => void;
  stepNumber: number;
  onContinue: () => void;
  isFinalStep: boolean;
}) {
  const isRating = question.key === "rating";
  const isTextInput = question.options.length === 0;

  if (isTextInput) {
    return (
      <section
        className="feedback-rise"
        aria-labelledby={`${question.id}-heading`}
        data-testid={`section-${question.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[.18em-[#77766F] ">
              {`${stepNumber}`.padStart(2, "0")} / your words
            </p>
            <h2
              id={`${question.id}-heading`}
              className="font-serif text-[clamp(1.8rem,6vw,2.8rem)] leading-[1.02] tracking-[-.045em] text-[#1B4D3E]"
            >
              {question.question}
            </h2>
            {question.description && (
              <p className="mt-3 max-w-md text-[15px] leading-6 text-[#5f776b]">
                {question.description}
              </p>
            )}
          </div>
          <MessageCircle
            className="mt-2 shrink-0 text-[#8fb4a3]"
            size={26}
            strokeWidth={1.5}
          />
        </div>
        <div className="relative mt-5">
          <textarea
            value={value ?? ""}
            maxLength={1000}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Optional — share as much detail as you like…"
            aria-label="Optional comment"
            className="min-h-[118px] w-full resize-none rounded-[18px] border border-[#D8D5CD] bg-white px-4 py-4 text-[15px] leading-6 text-[#1A1A1A] outline-none transition-all placeholder:text-[#A09E95] focus:border-[#1A1A1A] focus:ring-4 focus:ring-[#1A1A1A]/10"
            data-testid={`input-${question.id}`}
          />
          <span
            className="absolute bottom-3 right-4 font-mono text-[10px] text-[#799488]"
            data-testid="text-comment-count"
          >
            {(value ?? "").length}/1000
          </span>
        </div>
        {!isFinalStep && (
          <button
            type="button"
            onClick={onContinue}
            className="mt-6 flex min-h-12 items-center gap-2 rounded-full bg-[#1A1A1A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#30302D]"
          >
            Continue <ArrowRight size={16} />
          </button>
        )}
      </section>
    );
  }

  return (
    <section
      className="feedback-rise"
      aria-labelledby={`${question.id}-heading`}
      data-testid={`section-${question.id}`}
    >
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#1B4D3E]">
        {`${stepNumber}`.padStart(2, "0")} / your visit
      </p>
      <h1
        id={`${question.id}-heading`}
        className={`font-serif leading-[.98] tracking-[-.055em] text-[#1A1A1A] ${isRating
          ? "max-w-[14ch] text-[clamp(2.45rem,11vw,4.4rem)]"
          : "text-[clamp(1.8rem,6vw,2.8rem)]"
          }`}
      >
        {question.question}
      </h1>
      <p className="mt-5 max-w-md text-[15px] leading-6 text-[#6B6B63]">
        A quick gut check helps us make the next visit even more yours.
      </p>
      <div
        className={`mt-8 flex flex-wrap gap-2.5 ${isRating ? "items-center" : ""}`}
        role="radiogroup"
        aria-label={question.question}
      >
        {question.options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onAnswer(option.value, option.next)}
              className={`choice-ring ${isRating
                ? `flex min-h-[68px] min-w-[68px] flex-col items-center justify-center gap-1 rounded-[17px] border px-2 ${active
                  ? "border-[#CCFF00] bg-[#CCFF00] text-[#1B4D3E] shadow-[0_8px_18px_rgba(27,77,62,.12)]"
                  : "border-[#D8D5CD] bg-[#F7F5F0] text-[#85847D] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                }`
                : `min-h-11 rounded-full border px-4 py-2.5 text-[13px] font-medium ${active
                  ? "border-[#1A1A1A] bg-[#1A1A1A] text-[#FFFFFF]"
                  : "border-[#D8D5CD] bg-[#F7F5F0] text-[#45443F] hover:border-[#1A1A1A]"
                }`
                }`}
              data-testid={`button-${question.id}-${option.value}`}
            >
              {isRating ? (
                <>
                  <Star
                    size={20}
                    strokeWidth={1.7}
                    fill={active ? "currentColor" : "none"}
                  />
                  <span className="text-[10px] font-semibold leading-none">
                    {option.label}
                  </span>
                </>
              ) : (
                option.label
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FeedbackForm() {
  const [, setLocation] = useLocation();
  const createFeedback = useCreateFeedback();
  const restaurantLocation = useMemo(() => getLocationFromQr(), []);
  console.log("QR RESTAURANT LOCATION:", JSON.stringify(restaurantLocation));

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>(["root"]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentQuestionId = history[history.length - 1];
  const currentQuestion = questionFlow[currentQuestionId];

  const handleAnswer = (value: string, next?: string | null) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.key]: value,
      ...(currentQuestion.key === "rating"
        ? { feedbackType: Number(value) >= 4 ? "positive" : Number(value) === 3 ? "neutral" : "negative" }
        : {}),
    }));
    if (next) {
      const resolvedNext = next.endsWith("-attribute")
        ? `${currentQuestionId.replace("-category", "")}-${value}-attribute`
        : next;
      setHistory((prev) => [...prev, resolvedNext]);
    }
  };

  const continueFromTextQuestion = () => {
    if (currentQuestionId === "specific-detail" && answers.feedbackType === "positive" && answers.category === "food") {
      setHistory((prev) => [...prev, "dish"]);
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createFeedback.isPending) return;

    setErrorMessage(null);

    const input: FeedbackInput = {
      rating: parseInt(answers.rating, 10),
      // Positive visits deliberately use "none" so they remain valid, useful
      // records without being counted as a complaint category.
      painPoint: (answers.category === "nothing" ? "none" : answers.category || "other") as FeedbackInput["painPoint"],
      location: restaurantLocation,
      enjoyedMost: answers.feedbackType === "positive" ? answers.category || null : null,
      primaryIssue: answers.attribute || null,
      secondaryIssue: answers.specificDetail || null,
      rootCause: answers.specificDetail || answers.attribute || null,
      finalComment: answers.specificDetail || null,
      feedbackType: (answers.feedbackType || null) as FeedbackInput["feedbackType"],
      category: answers.category || null,
      attribute: answers.attribute || null,
      specificDetail: answers.specificDetail || null,
      dish: answers.dish || null,
    };

    createFeedback.mutate(
      { data: input },
      {
        onSuccess: (receipt) => {
          sessionStorage.setItem(
            "restaurant-feedback-receipt",
            JSON.stringify(receipt)
          );
          setLocation("/thank-you");
        },
        onError: (error) => {
          const apiError = error as {
            response?: { data?: { error?: string } };
            message?: string;
          };
          setErrorMessage(
            apiError.response?.data?.error ||
            apiError.message ||
            "That did not go through. Please try once more."
          );
        },
      }
    );
  };

  const isFinished =
    currentQuestion.options.length === 0 &&
    (currentQuestionId === "dish" || !(answers.feedbackType === "positive" && answers.category === "food"));

  return (
    <main className="min-h-[100dvh] bg-[#FFFFFF] text-[#1B4D3E] warm-grain">
      <div className="mx-auto grid min-h-[100dvh] max-w-[1360px] lg:grid-cols-[minmax(330px,0.78fr)_minmax(520px,1.22fr)]">
        <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#1A1A1A] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          {/* Subtle architectural lines — keeps the background from feeling empty */}
          <div className="absolute -right-32 top-24 size-80 rounded-full border border-white/[0.06]" />
          <div className="absolute -right-12 top-40 size-48 rounded-full border border-white/[0.05]" />
          <div className="absolute -bottom-24 -left-24 size-64 rounded-full border border-[#D4FF1A]/[0.08]" />
          <div className="relative z-10">
            <BrandMark inverse />
            <div className="mt-32 max-w-[390px]">
              <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[2px] text-[#D4FF1A]">
                The honest minute
              </p>
              <h2 className="font-serif text-[clamp(3.5rem,5.5vw,5.8rem)] font-bold leading-[0.9] tracking-[-0.055em] text-white">
                Your voice
                <br />
                <span className="text-[#D4FF1A]">shapes us.</span>
              </h2>
              <p className="mt-8 max-w-[330px] text-[15px] leading-7 text-white/60">
                Every note at the table. Every moment that matters.
                <span className="text-white/85"> We're listening.</span>
              </p>
            </div>
          </div>
          <div className="relative z-10 border-t border-white/[0.1] pt-5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[.15em] text-white/45">
              <span>
                {`${history.length}`.padStart(2, "0")} —{" "}
                {`${history.length}`.padStart(2, "0")}
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck size={14} strokeWidth={1.7} />
                no account needed
              </span>
            </div>
          </div>
        </aside>

        <div className="relative flex flex-col bg-[#F7F5F0] px-5 pb-8 pt-6 text-[#1A1A1A] sm:px-10 sm:pt-9 lg:px-[clamp(3rem,8vw,9rem)] lg:py-12">

          <header
            className="mb-11 flex items-center justify-between lg:mb-20"
            data-testid="header-feedback"
          >
            <div className="lg:hidden">
              <BrandMark />
            </div>
            <div className="hidden lg:block" />
            <span
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.15em] text-[#6B6B63]"
              data-testid="text-privacy"
            >
              <ShieldCheck size={14} strokeWidth={1.8} /> private by design
            </span>
          </header>

          <div className="w-full max-w-[600px] self-center">
            <Progress step={history.length} total={history.length} />
            <form onSubmit={submit} noValidate>
              {history.map((questionId, index) => {
                const question = questionFlow[questionId];
                const isCurrent = index === history.length - 1;
                return (
                  <div key={questionId} style={{ display: isCurrent ? 'block' : 'none' }}>
                    <QuestionStep
                      question={question}
                      value={answers[question.key] || null}
                      onAnswer={handleAnswer}
                      stepNumber={index + 1}
                      onContinue={continueFromTextQuestion}
                      isFinalStep={isFinished}
                    />
                  </div>
                )
              })}

              <div className="mt-8">
                {errorMessage && (
                  <div
                    className="mb-4 flex items-start gap-3 rounded-[15px] border border-[#d8aaa0] bg-[#fff5f2] px-4 py-3 text-[13px] leading-5 text-[#9a3b2b]"
                    role="alert"
                    data-testid="status-submit-error"
                  >
                    <CircleAlert className="mt-0.5 shrink-0" size={17} />
                    <span>{errorMessage}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!isFinished || createFeedback.isPending}
                  className="group flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[17px] bg-[#CCFF00] px-6 text-[15px] font-semibold text-[#143B2E] shadow-[0_10px_22px_rgba(27,77,62,.12)] transition-[transform,background-color,opacity]hover:bg-[#D4FF1A]  active:scale-[.985] disabled:cursor-not-allowed disabled:bg-[#D8D5CD] disabled:text-[#8B8981] disabled:shadow-none"
                  data-testid="button-submit-feedback"
                >
                  {createFeedback.isPending ? (
                    <>
                      <span className="size-4 animate-pulse rounded-full border-2 border-[#143B2E]/30 border-t-[#143B2E]" />
                      Sending quietly…
                    </>
                  ) : (
                    <>
                      Leave a note{" "}
                      <ArrowRight
                        className="transition-transform group-hover:translate-x-1"
                        size={18}
                      />
                    </>
                  )}
                </button>
                <p
                  className="mt-4 flex items-center justify-center gap-2 text-center font-mono text-[10px] uppercase tracking-[.12em] text-[#5f776b]"
                  data-testid="text-submit-note"
                >
                  <Clock3 size={13} /> takes about 30 seconds · no sign-in
                </p>
              </div>
            </form>
          </div>

          <footer className="mt-auto hidden pt-14 text-center lg:block">
            <p className="text-[12px] text-[#799488]">
              A thoughtful pause before you head home.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}

export default FeedbackForm;
