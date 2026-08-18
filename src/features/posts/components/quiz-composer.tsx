'use client';

import { useId } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, Radio, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import type { QuizDetails, QuizQuestion } from '../types/post';

/**
 * Author-side quiz builder — the `quizDetails` block of `createPost` / `createBookPost`.
 *
 * NOT A POST KIND. `PostType` has no `QUIZ` member; `PostService.buildAndSavePost` runs
 * `validateQuizDetails` for **any** post whose `quizDetails` is non-null. So this is an
 * attachment the author switches on next to a location, not an entry in the kind switcher.
 * Building it as a kind would have made it mutually exclusive with article, poll and the rest
 * for no reason the backend has.
 *
 * THE BACKEND ACTUALLY VALIDATES THIS, unlike the five kinds in P2.4c-3. Every gate below
 * mirrors a line of `PostService.validateQuizDetails`, and the server's message even carries
 * the offending question's index:
 * - `title` required (`Strings.hasText`)
 * - at least one question
 * - per question: non-empty text, **at least 2 options**, and `correctOptionIndex` within
 *   `[0, options.size)`
 *
 * `explanation` is on the Java record and validated by nothing — optional here too.
 *
 * THE READER SIDE IS NOT HERE. `QuizTaker` needs a rendered post to attach to and there is no
 * `GET /posts/{id}`, so it waits for the feed card in cycle 2 (see the ledger). Worth knowing
 * before designing anything around it: `POST /quiz/submit` returns `correctAnswers`, i.e.
 * submitting a quiz hands the client the answer key, and no endpoint reads a past attempt back.
 */
export interface QuizComposerProps {
  value: QuizDetails;
  onChange: (value: QuizDetails) => void;
}

/** `validateQuizDetails`: `options.size() < 2` is a 400. */
export const QUIZ_MIN_OPTIONS = 2;
const QUIZ_MAX_OPTIONS = 6;

/** A fresh question, already carrying the minimum option count the server demands. */
export function emptyQuizQuestion(): QuizQuestion {
  return {
    question: '',
    options: Array.from({ length: QUIZ_MIN_OPTIONS }, () => ''),
    correctOptionIndex: 0,
  };
}

/** A quiz with one blank question — the state the attachment switches on with. */
export function emptyQuiz(): QuizDetails {
  return { title: '', questions: [emptyQuizQuestion()] };
}

/**
 * The composer's submit gate for an attached quiz. Same conditions as
 * `PostService.validateQuizDetails`, plus one the server does not have: options must carry
 * text. Two blank options pass the server's size check and produce a question nobody can
 * answer, so an empty option is treated here as an option that is not there.
 */
export function isQuizReady(quiz: QuizDetails): boolean {
  if (!(quiz.title ?? '').trim()) return false;
  const questions = quiz.questions ?? [];
  if (questions.length === 0) return false;

  return questions.every((question) => {
    if (!(question.question ?? '').trim()) return false;
    const filled = (question.options ?? []).filter((option) => option.trim().length > 0);
    if (filled.length < QUIZ_MIN_OPTIONS) return false;
    const correct = question.correctOptionIndex;
    if (correct == null || correct < 0 || correct >= (question.options ?? []).length) return false;
    // The marked answer must be one of the options that survives the blank filter below —
    // otherwise the payload's index would point at a different option than the author picked.
    return ((question.options ?? [])[correct] ?? '').trim().length > 0;
  });
}

/**
 * Drops blank options and re-points `correctOptionIndex` at wherever the marked answer landed.
 * Sending the raw list instead would either fail the server's range check or, worse, pass it
 * while marking the wrong answer correct.
 */
export function normalizeQuiz(quiz: QuizDetails): QuizDetails {
  return {
    title: (quiz.title ?? '').trim(),
    questions: (quiz.questions ?? []).map((question) => {
      const options = question.options ?? [];
      const correct = question.correctOptionIndex ?? 0;
      const kept = options
        .map((option, index) => ({ option: option.trim(), index }))
        .filter((entry) => entry.option.length > 0);

      return {
        question: (question.question ?? '').trim(),
        options: kept.map((entry) => entry.option),
        correctOptionIndex: Math.max(
          0,
          kept.findIndex((entry) => entry.index === correct)
        ),
        explanation: (question.explanation ?? '').trim() || undefined,
      };
    }),
  };
}

export function QuizComposer({ value, onChange }: QuizComposerProps) {
  const t = useT();
  // Radio grouping is per question, and two composers could in principle coexist — the group
  // name has to be unique to this instance, not just to the question index.
  const groupPrefix = useId();
  const questions = value.questions ?? [];

  const patchQuestion = (index: number, patch: Partial<QuizQuestion>) =>
    onChange({
      ...value,
      questions: questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question
      ),
    });

  const setOption = (questionIndex: number, optionIndex: number, text: string) => {
    const options = [...(questions[questionIndex].options ?? [])];
    options[optionIndex] = text;
    patchQuestion(questionIndex, { options });
  };

  const addOption = (questionIndex: number) =>
    patchQuestion(questionIndex, { options: [...(questions[questionIndex].options ?? []), ''] });

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    const options = (question.options ?? []).filter((_, i) => i !== optionIndex);
    const correct = question.correctOptionIndex ?? 0;
    patchQuestion(questionIndex, {
      options,
      // Removing an option above the marked answer shifts it down; removing the marked answer
      // itself has to land somewhere, and the first option is the only defensible default.
      correctOptionIndex:
        correct === optionIndex ? 0 : correct > optionIndex ? correct - 1 : correct,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        label={t('createPost.quiz.title')}
        value={value.title ?? ''}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
        placeholder={t('createPost.quiz.titlePlaceholder')}
      />

      {questions.map((question, questionIndex) => (
        <div
          key={questionIndex}
          className="flex flex-col gap-2.5 rounded-nx-sm border border-nx-border-default bg-nx-surface-card p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-nx-body-sm font-semibold text-nx-text-primary">
              {t('createPost.quiz.questionN', { index: questionIndex + 1 })}
            </span>
            <Button
              size="sm"
              variant="ghost"
              icon={<X />}
              disabled={questions.length <= 1}
              onClick={() =>
                onChange({ ...value, questions: questions.filter((_, i) => i !== questionIndex) })
              }
              aria-label={t('createPost.quiz.removeQuestion')}
            />
          </div>

          <Textarea
            autoResize
            rows={2}
            value={question.question ?? ''}
            onChange={(event) => patchQuestion(questionIndex, { question: event.target.value })}
            placeholder={t('createPost.quiz.questionPlaceholder')}
            aria-label={t('createPost.quiz.questionN', { index: questionIndex + 1 })}
          />

          <div className="flex flex-col gap-2">
            <span className="text-nx-body-sm font-medium text-nx-text-primary">
              {t('createPost.quiz.options')}
            </span>

            {(question.options ?? []).map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <Radio
                  name={`${groupPrefix}-q${questionIndex}`}
                  value={String(optionIndex)}
                  checked={(question.correctOptionIndex ?? 0) === optionIndex}
                  onChange={() => patchQuestion(questionIndex, { correctOptionIndex: optionIndex })}
                  aria-label={t('createPost.quiz.markCorrect', { index: optionIndex + 1 })}
                />
                <Input
                  size="sm"
                  value={option}
                  onChange={(event) => setOption(questionIndex, optionIndex, event.target.value)}
                  placeholder={t('createPost.quiz.optionPlaceholder', { index: optionIndex + 1 })}
                  aria-label={t('createPost.quiz.optionPlaceholder', { index: optionIndex + 1 })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  icon={<X />}
                  disabled={(question.options ?? []).length <= QUIZ_MIN_OPTIONS}
                  onClick={() => removeOption(questionIndex, optionIndex)}
                  aria-label={t('createPost.quiz.removeOption')}
                />
              </div>
            ))}

            {(question.options ?? []).length < QUIZ_MAX_OPTIONS && (
              <Button
                size="sm"
                variant="secondary"
                className="self-start"
                icon={<Plus />}
                onClick={() => addOption(questionIndex)}
              >
                {t('createPost.quiz.addOption')}
              </Button>
            )}

            <p className="text-nx-caption text-nx-text-muted">{t('createPost.quiz.correctHint')}</p>
          </div>

          <Input
            size="sm"
            label={t('createPost.quiz.explanation')}
            hint={t('createPost.quiz.explanationHint')}
            value={question.explanation ?? ''}
            onChange={(event) => patchQuestion(questionIndex, { explanation: event.target.value })}
          />
        </div>
      ))}

      <Button
        size="sm"
        variant="secondary"
        className="self-start"
        icon={<Plus />}
        onClick={() => onChange({ ...value, questions: [...questions, emptyQuizQuestion()] })}
      >
        {t('createPost.quiz.addQuestion')}
      </Button>
    </div>
  );
}
