import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Heart, RotateCcw, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';

type Receipt = { id?: string; message?: string };

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5" data-testid="brand-mark">
      <span className="grid size-9 place-items-center rounded-full bg-[#CCFF00] text-[#1B4D3E] shadow-[0_5px_14px_rgba(27,77,62,.12)]">
        <span className="h-4 w-4 rounded-full border-[1.5px] border-[#1B4D3E] border-dashed" />
      </span>
      <span className="font-serif text-[1.15rem] font-semibold tracking-[-.03em] text-[#1B4D3E]">ReRu</span>
    </div>
  );
}

export default function ThankYou() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('restaurant-feedback-receipt');
    if (stored) {
      try {
        setReceipt(JSON.parse(stored) as Receipt);
      } catch {
        setReceipt(null);
      }
    }
  }, []);

  return (
    <main className="warm-grain flex min-h-[100dvh] items-center justify-center bg-[#FFFFFF] px-5 py-8 text-[#1B4D3E]">
      <div className="w-full max-w-[510px] text-center">
        <header className="mb-16 flex justify-center sm:mb-20"><BrandMark /></header>
        <div className="feedback-pop mx-auto grid size-[82px] place-items-center rounded-full bg-[#1B4D3E] text-[#CCFF00] shadow-[0_14px_30px_rgba(27,77,62,.12)]" data-testid="icon-success">
          <Check size={38} strokeWidth={2.2} />
        </div>
        <p className="mt-8 font-mono text-[10px] uppercase tracking-[.2em] text-[#1B4D3E]">Note received</p>
        <h1 className="mt-4 font-serif text-[clamp(3rem,13vw,5rem)] leading-[.92] tracking-[-.065em] text-[#1B4D3E]" data-testid="heading-thank-you">
          Thank you<br /><span className="text-[#1B4D3E]">for the honesty.</span>
        </h1>
        <p className="mx-auto mt-7 max-w-[370px] text-[15px] leading-6 text-[#5f776b]" data-testid="text-receipt-message">
          {receipt?.message || 'Your note is with our team. We’ll carry it into the next service.'}
        </p>
        {receipt?.id && <p className="mt-5 font-mono text-[10px] uppercase tracking-[.14em] text-[#799488]" data-testid="text-receipt-id">ref · {receipt.id.slice(0, 8)}</p>}
        <div className="mx-auto mt-12 max-w-[340px] border-t border-[#d8e3dc] pt-5 text-[12px] leading-5 text-[#5f776b]">
          <p className="flex items-center justify-center gap-2"><Heart size={14} className="text-[#1B4D3E]" /> Your words help shape this place.</p>
        </div>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-[#CCFF00] px-5 text-[13px] font-semibold text-[#143B2E] transition-transform hover:-translate-y-0.5" data-testid="link-send-another">
            <RotateCcw size={15} /> Send another note
          </Link>
          <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] px-4 text-[13px] font-medium text-[#5f776b] hover:text-[#1B4D3E]" data-testid="link-return">
            <ArrowLeft size={15} /> Return
          </Link>
        </div>
        <p className="mt-16 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-[#799488]"><ShieldCheck size={13} /> shared without an account</p>
      </div>
    </main>
  );
}