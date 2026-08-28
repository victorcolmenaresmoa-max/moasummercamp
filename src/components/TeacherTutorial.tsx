'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckIcon } from '@/components/ui/Icons';

const STEPS = [
  {
    title: 'Start from My dashboard',
    body: 'Your four Reading Labs live on the dashboard. Open only the day your moderator has unlocked. A locked day cannot be completed early.',
    tip: 'Use “Continue where you left off” to return to the current Lab quickly.',
  },
  {
    title: 'Complete every answer field',
    body: 'Type or select your answer in each activity. Your work saves automatically while you work, so you do not need a Save button.',
    tip: 'Wait for the small Saved status before closing the browser if you just finished typing.',
  },
  {
    title: 'Use checkpoints correctly',
    body: 'When you reach a checkpoint, complete the requested items and submit it for moderator review. The moderator can approve it or ask you to revise it.',
    tip: 'A checkpoint is part of the Lab flow; do not skip it just because your written answers are complete.',
  },
  {
    title: 'Record your AI evidence',
    body: 'When the workbook gives you an AI prompt, open Gemini from the provided button. Record every prompt you actually used and save the AI response as text, a screenshot, or both.',
    tip: 'The purpose is to show responsible AI use: read first, think second, ask AI third.',
  },
  {
    title: 'Before you leave a Lab',
    body: 'If answers are still missing, the system will stop you from leaving and take you to the first incomplete field. Your Lab time is also tracked only while you are inside the Lab.',
    tip: 'When you leave and come back later, your accumulated Lab time continues from where it stopped.',
  },
] as const;

export function TeacherTutorial({
  userId,
  tutorialSeenAt,
}: {
  userId: string;
  tutorialSeenAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const storageKey = useMemo(() => `moa:tutorial-seen:${userId}`, [userId]);

  useEffect(() => {
    if (tutorialSeenAt) return;
    try {
      if (window.localStorage.getItem(storageKey) === '1') return;
    } catch {
      // localStorage can be unavailable in restrictive browser modes.
    }
    setOpen(true);
  }, [storageKey, tutorialSeenAt]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const markSeen = async () => {
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // Database persistence below is the primary source of truth.
    }

    if (!tutorialSeenAt) {
      await createClient()
        .from('profiles')
        .update({ tutorial_seen_at: new Date().toISOString() })
        .eq('id', userId);
    }
  };

  const closeTutorial = async () => {
    setOpen(false);
    setStep(0);
    await markSeen();
  };

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <>
      <button
        type="button"
        className="btn-ghost btn-sm no-print"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
      >
        Tutorial
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-plum-500/70 p-4 no-print" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-tutorial-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-moa-lg"
          >
            <div className="bg-teal-600 px-6 py-5 text-white sm:px-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="eyebrow text-sun-400">Teacher quick guide</p>
                  <h2 id="teacher-tutorial-title" className="h-display mt-1.5 text-2xl sm:text-3xl">
                    Everything you need to use the Reading Lab
                  </h2>
                </div>
                <span className="chip shrink-0 bg-white/15 text-white">
                  {step + 1}/{STEPS.length}
                </span>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-7">
              <div className="flex gap-2" aria-hidden="true">
                {STEPS.map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-teal-500' : 'bg-teal-100'}`}
                  />
                ))}
              </div>

              <div className="mt-7 flex gap-4">
                <span className="h-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sun-400 text-lg text-plum-500">
                  {step + 1}
                </span>
                <div>
                  <h3 className="h-display text-xl text-teal-900">{current.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/70">{current.body}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border-2 border-teal-100 bg-teal-50/60 p-4">
                <div className="flex gap-3">
                  <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                  <p className="text-sm font-bold leading-relaxed text-teal-800">{current.tip}</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-teal-50 pt-5">
                <button type="button" className="btn-ghost" onClick={closeTutorial}>
                  Close guide
                </button>
                <div className="flex gap-2">
                  {step > 0 && (
                    <button type="button" className="btn-ghost" onClick={() => setStep((s) => s - 1)}>
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-primary min-w-28"
                    onClick={() => {
                      if (last) void closeTutorial();
                      else setStep((s) => s + 1);
                    }}
                  >
                    {last ? 'Got it' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
