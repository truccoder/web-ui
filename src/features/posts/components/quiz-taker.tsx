'use client';

import { useId, useState } from 'react';
import { Badge, Button, Radio } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useSubmitQuiz } from '../hooks/use-quiz';
import type { PublicQuizDetails } from '../types/post';

/**
 * The reader's side of a quiz attached to a post.
 *
 * THE ANSWER KEY IS NO LONGER LEAKED, and this file used to say the opposite at length. The
 * old note recorded two leaks: `QuizQuestion.correctOptionIndex` riding along inside the post
 * payload, so the answers were readable in devtools before anyone answered anything, and
 * `QuizResultResponseDto.correctAnswers` returning them on submit. The first is closed — the
 * read side now receives `PublicQuizDetailsDto`, which carries `question` and `options` only
 * (verified in the spec at F-B). The second is not a leak at all: answers *should* come back
 * with a grade, which is exactly when they arrive.
 *
 * So the grading marks below are the only place answers appear, and they are honest now rather
 * than a polite fiction over a payload that had already given the game away.
 *
 * THE RESULT ONLY EXISTS IN THIS COMPONENT'S MEMORY. There is no endpoint to read a past
 * attempt back, so navigating away or reloading loses it for good. That is why the result
 * replaces the form in place instead of, say, redirecting somewhere.
 */
export interface QuizTakerProps {
  postId: number;
  quiz: PublicQuizDetails;
  className?: string;
}

export function QuizTaker({ postId, quiz, className }: QuizTakerProps) {
  const t = useT();
  const groupName = useId();
  const submit = useSubmitQuiz();

  const questions = (quiz.questions ?? []).filter((q) => q.question?.trim());
  const [answers, setAnswers] = useState<Record<number, number>>({});

  if (questions.length === 0) return null;

  const result = submit.data;
  // `QuizService` rejects a list whose length does not match the question count, so every
  // question must be answered before the button is live.
  const allAnswered = questions.every((_, index) => answers[index] !== undefined);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-nx-sm border border-nx-border-default p-3',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-nx-ui font-semibold text-nx-text-primary">
          {quiz.title?.trim() || t('post.quiz.title')}
        </p>
        {result && (
          <Badge variant={result.score === result.totalQuestions ? 'success' : 'info'}>
            {t('post.quiz.score', { score: result.score, total: result.totalQuestions })}
          </Badge>
        )}
      </div>

      <ol className="flex flex-col gap-3">
        {questions.map((question, questionIndex) => {
          const correctIndex = result?.correctAnswers?.[questionIndex];
          const chosen = answers[questionIndex];

          return (
            <li key={questionIndex} className="flex flex-col gap-1.5">
              <p className="text-nx-body-sm font-medium text-nx-text-primary">
                {question.question}
              </p>

              {(question.options ?? []).map((option, optionIndex) => {
                // After grading, mark the key and the user's wrong pick. Before grading there
                // is nothing to mark and nothing to withhold: `correctAnswers` arrives with the
                // grade, and the questions themselves no longer carry it.
                const isCorrect = result !== undefined && correctIndex === optionIndex;
                const isWrongPick =
                  result !== undefined && chosen === optionIndex && correctIndex !== optionIndex;

                return (
                  <Radio
                    key={optionIndex}
                    name={`${groupName}-${questionIndex}`}
                    value={String(optionIndex)}
                    checked={chosen === optionIndex}
                    disabled={result !== undefined}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }))
                    }
                    className={cn(
                      isCorrect && 'text-nx-status-success-fg',
                      isWrongPick && 'text-nx-status-danger-fg'
                    )}
                    label={option}
                  />
                );
              })}

              {/* The per-question explanation comes back with the GRADE, not with the question:
                  `PublicQuizQuestionDto` has no `explanation` field at all, so the old read off
                  `question.explanation` could never fire. `QuizResultResponseDto.explanations`
                  is positional, like `correctAnswers`. Still optional — the author is not made
                  to write one. */}
              {result?.explanations?.[questionIndex]?.trim() && (
                <p className="text-nx-caption text-nx-text-secondary">
                  {result.explanations[questionIndex]}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {submit.error && (
        <p className="text-nx-micro text-nx-status-danger-fg">{getErrorMessage(submit.error)}</p>
      )}

      {result ? (
        <p className="text-nx-micro text-nx-text-muted">{t('post.quiz.resultNotSaved')}</p>
      ) : (
        <div>
          <Button
            size="sm"
            disabled={!allAnswered}
            loading={submit.isPending}
            onClick={() =>
              submit.mutate({
                postId,
                // Question order is the answer order — `QuizService` grades positionally.
                payload: { selectedOptions: questions.map((_, index) => answers[index]) },
              })
            }
          >
            {t('post.quiz.submit')}
          </Button>
        </div>
      )}
    </div>
  );
}
