import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, CircleAlert, Clock3, MessageCircle, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { useLocation } from 'wouter';
import { useCreateFeedback } from '@workspace/api-client-react';
import type { FeedbackInput, FeedbackInputPainPoint } from '@workspace/api-client-react';

type Step = 1 | 2 | 3;

const painPoints: Array<{ value: FeedbackInputPainPoint; label: string }> = [
  { value: 'food', label: 'The food' },
  { value: 'service', label: 'Service' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'ambience', label: 'Atmosphere' },
  { value: 'value', label: 'Value' },
  { value: 'none', label: 'Nothing in particular' },
];

function getLocationFromQr() {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('location');
  return value?.trim() || null;
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5" data-testid="brand-mark">
      <span className="grid size-9 place-items-center rounded-full bg-[#ee704c] text-[#fff8eb] shadow-[0_5px_14px_rgba(191,70,40,.2)]">
        <span className="h-4 w-4 rounded-full border-[1.5px] border-[#fff8eb] border-dashed" />
      </span>
      <span className="font-serif text-[1.15rem] font-semibold tracking-[-0.03em] text-[#362922]">Morrow &amp; Salt</span>
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  return (
    <div className="mb-8 flex items-center gap-2" aria-label={`Step ${step} of 3`} data-testid="progress-feedback">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-2">
          <span
            className={`grid size-6 place-items-center rounded-full text-[11px] font-bold transition-colors ${
              item <= step ? 'bg-[#ee704c] text-[#fff8eb]' : 'bg-[#eadfce] text-[#8a7668]'
            }`}
            aria-current={item === step ? 'step' : undefined}
          >
            {item < step ? <Check size={13} strokeWidth={3} /> : item}
          </span>
          {item < 3 && <span className={`h-px w-8 transition-colors sm:w-12 ${item < step ? 'bg-[#ee704c]' : 'bg-[#eadfce]'}`} />}
        </div>
      ))}
      <span className="ml-1 font-mono text-[10px] uppercase tracking-[.15em] text-[#927e70]">under a minute</span>
    </div>
  );
}

function RatingStep({
  rating,
  onChoose,
}: {
  rating: number | null;
  onChoose: (rating: number) => void;
}) {
  return (
    <section className="feedback-rise" aria-labelledby="rating-heading" data-testid="section-rating">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#b45139]">01 / your visit</p>
      <h1 id="rating-heading" className="max-w-[14ch] font-serif text-[clamp(2.45rem,11vw,4.4rem)] leading-[.98] tracking-[-.055em] text-[#362922]">
        How did it feel to be here?
      </h1>
      <p className="mt-5 max-w-md text-[15px] leading-6 text-[#79685e]">
        A quick gut check helps us make the next visit even more yours.
      </p>
      <div className="mt-8 flex items-center gap-2.5" role="radiogroup" aria-label="Overall visit rating">
        {[1, 2, 3, 4, 5].map((item) => {
          const active = rating !== null && item <= rating;
          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={rating === item}
              aria-label={`${item} out of 5`}
              onClick={() => onChoose(item)}
              className={`choice-ring grid size-[52px] place-items-center rounded-[17px] border ${
                active
                  ? 'border-[#ee704c] bg-[#ee704c] text-[#fff8eb] shadow-[0_8px_20px_rgba(191,70,40,.2)]'
                  : 'border-[#dacbbb] bg-[#fffaf1] text-[#c8b6a6] hover:border-[#ee704c] hover:text-[#ee704c]'
              }`}
              data-testid={`button-rating-${item}`}
            >
              <Star size={22} strokeWidth={1.7} fill={active ? 'currentColor' : 'none'} />
            </button>
          );
        })}
      </div>
      <p className="mt-3 min-h-5 text-[12px] text-[#927e70]" aria-live="polite" data-testid="text-rating-hint">
        {rating === null ? 'Tap a feeling, not a number.' : ['', 'We missed the mark.', 'A little uneven.', 'A good visit.', 'Really lovely.', 'We’re blushing.'][rating]}
      </p>
    </section>
  );
}

function FeedbackForm() {
  const [, setLocation] = useLocation();
  const createFeedback = useCreateFeedback();
  const location = useMemo(() => getLocationFromQr(), []);
  const [rating, setRating] = useState<number | null>(null);
  const [painPoint, setPainPoint] = useState<FeedbackInputPainPoint | null>(null);
  const [comment, setComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const step: Step = rating === null ? 1 : painPoint === null ? 2 : 3;
  const canSubmit = rating !== null && painPoint !== null;

  const chooseRating = (value: number) => {
    setRating(value);
    setErrorMessage(null);
  };

  const choosePainPoint = (value: FeedbackInputPainPoint) => {
    setPainPoint(value);
    setErrorMessage(null);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || rating === null || painPoint === null || createFeedback.isPending) return;

    setErrorMessage(null);
    const input: FeedbackInput = {
      rating,
      painPoint,
      comment: comment.trim() ? comment.trim() : null,
      location,
    };

    createFeedback.mutate(
      { data: input },
      {
        onSuccess: (receipt) => {
          sessionStorage.setItem('restaurant-feedback-receipt', JSON.stringify(receipt));
          setLocation('/thank-you');
        },
        onError: (error) => {
          const apiError = error as { response?: { data?: { error?: string } }; message?: string };
          setErrorMessage(apiError.response?.data?.error || apiError.message || 'That did not go through. Please try once more.');
        },
      },
    );
  };

  return (
    <main className="min-h-[100dvh] bg-[#f7f0e5] text-[#362922] warm-grain">
      <div className="mx-auto grid min-h-[100dvh] max-w-[1360px] lg:grid-cols-[minmax(330px,0.78fr)_minmax(520px,1.22fr)]">
        <aside className="relative hidden overflow-hidden bg-[#2f2521] px-10 py-10 text-[#fff8eb] lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute -right-28 top-20 size-72 rounded-full border border-[#796459]/40" />
          <div className="absolute -right-12 top-36 size-40 rounded-full border border-[#796459]/30" />
          <div className="relative z-10">
            <BrandMark />
            <div className="mt-32 max-w-[300px]">
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#eaa58d]">The honest minute</p>
              <h2 className="mt-5 font-serif text-[clamp(3rem,5vw,5rem)] leading-[.94] tracking-[-.06em] text-[#fff8eb]">
                Small notes.<br /><span className="text-[#eaa58d]">Better nights.</span>
              </h2>
              <p className="mt-7 max-w-[250px] text-sm leading-6 text-[#cbbab0]">
                We read every note at the table. Thank you for leaving one while the evening is still fresh.
              </p>
            </div>
          </div>
          <div className="relative z-10 flex items-end justify-between border-t border-[#796459]/45 pt-5 text-[11px] text-[#bca99e]">
            <span>01 — 03</span>
            <span className="flex items-center gap-2"><ShieldCheck size={14} /> no account needed</span>
          </div>
          <div className="feedback-drift absolute bottom-28 right-24 size-20 rounded-[23px] border border-[#eaa58d]/35 bg-[#eaa58d]/10" />
        </aside>

        <div className="relative flex flex-col px-5 pb-8 pt-6 sm:px-10 sm:pt-9 lg:px-[clamp(3rem,8vw,9rem)] lg:py-12">
          <header className="mb-11 flex items-center justify-between lg:mb-20" data-testid="header-feedback">
            <div className="lg:hidden"><BrandMark /></div>
            <div className="hidden lg:block" />
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.15em] text-[#927e70]" data-testid="text-privacy">
              <ShieldCheck size={14} strokeWidth={1.8} /> private by design
            </span>
          </header>

          <div className="w-full max-w-[600px] self-center">
            <Progress step={step} />
            <form onSubmit={submit} noValidate>
              <RatingStep rating={rating} onChoose={chooseRating} />

              <section className={`mt-12 transition-opacity duration-300 ${rating === null ? 'pointer-events-none opacity-35' : 'opacity-100'}`} aria-labelledby="improve-heading" data-testid="section-pain-point">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#b45139]">02 / one small thing</p>
                <h2 id="improve-heading" className="font-serif text-[clamp(1.8rem,6vw,2.8rem)] leading-[1.02] tracking-[-.045em] text-[#362922]">
                  What could have felt better?
                </h2>
                <p className="mt-3 text-[14px] leading-6 text-[#79685e]">Choose the closest thing. “Nothing” is a perfectly good answer.</p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {painPoints.map((item) => {
                    const active = painPoint === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => choosePainPoint(item.value)}
                        className={`choice-ring min-h-11 rounded-full border px-4 py-2.5 text-[13px] font-medium ${
                          active
                            ? 'border-[#362922] bg-[#362922] text-[#fff8eb]'
                            : 'border-[#dacbbb] bg-[#fffaf1] text-[#66554b] hover:border-[#927e70]'
                        }`}
                        data-testid={`button-pain-point-${item.value}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={`mt-12 transition-opacity duration-300 ${painPoint === null ? 'pointer-events-none opacity-35' : 'opacity-100'}`} aria-labelledby="comment-heading" data-testid="section-comment">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#b45139]">03 / in your words</p>
                    <h2 id="comment-heading" className="font-serif text-[clamp(1.8rem,6vw,2.8rem)] leading-[1.02] tracking-[-.045em] text-[#362922]">Anything else?</h2>
                  </div>
                  <MessageCircle className="mt-2 shrink-0 text-[#d7a28e]" size={26} strokeWidth={1.5} />
                </div>
                <div className="relative mt-5">
                  <textarea
                    value={comment}
                    maxLength={500}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="A dish you loved, a moment we should know about…"
                    aria-label="Optional comment"
                    className="min-h-[118px] w-full resize-none rounded-[18px] border border-[#dacbbb] bg-[#fffaf1] px-4 py-4 text-[15px] leading-6 text-[#362922] outline-none transition-colors placeholder:text-[#ac9a8c] focus:border-[#ee704c] focus:ring-4 focus:ring-[#ee704c]/10"
                    data-testid="input-comment"
                  />
                  <span className="absolute bottom-3 right-4 font-mono text-[10px] text-[#a38e80]" data-testid="text-comment-count">{comment.length}/500</span>
                </div>
              </section>

              <div className="mt-8">
                {errorMessage && (
                  <div className="mb-4 flex items-start gap-3 rounded-[15px] border border-[#e0a296] bg-[#fff3ed] px-4 py-3 text-[13px] leading-5 text-[#9a3b2b]" role="alert" data-testid="status-submit-error">
                    <CircleAlert className="mt-0.5 shrink-0" size={17} />
                    <span>{errorMessage}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!canSubmit || createFeedback.isPending}
                  className="group flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[17px] bg-[#ee704c] px-6 text-[15px] font-semibold text-[#fff8eb] shadow-[0_10px_22px_rgba(191,70,40,.18)] transition-[transform,background-color,opacity] hover:bg-[#d95f3d] active:scale-[.985] disabled:cursor-not-allowed disabled:bg-[#d8c7ba] disabled:text-[#947f71] disabled:shadow-none"
                  data-testid="button-submit-feedback"
                >
                  {createFeedback.isPending ? (
                    <>
                      <span className="size-4 animate-pulse rounded-full border-2 border-[#fff8eb]/40 border-t-[#fff8eb]" />
                      Sending quietly…
                    </>
                  ) : (
                    <>
                      Leave a note <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} />
                    </>
                  )}
                </button>
                <p className="mt-4 flex items-center justify-center gap-2 text-center font-mono text-[10px] uppercase tracking-[.12em] text-[#927e70]" data-testid="text-submit-note">
                  <Clock3 size={13} /> takes about 30 seconds · no sign-in
                </p>
              </div>
            </form>
          </div>

          <footer className="mt-auto hidden pt-14 text-center lg:block">
            <p className="text-[12px] text-[#a18f83]">A thoughtful pause before you head home.</p>
          </footer>
        </div>
      </div>
    </main>
  );
}

export default FeedbackForm;