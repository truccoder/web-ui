import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for QuizController (`POST /v1/api/posts/{postId}/quiz/submit`), derived from
 * `schema.gen.ts`.
 */

/**
 * One selected option index per question, in question order. `QuizService` rejects a list
 * whose length does not match the quiz's question count.
 */
export type SubmitQuizRequest = { selectedOptions: number[] };

/**
 * Grading result. All three fields are always populated — `QuizService.submitQuiz` builds
 * the DTO from a computed score, `quiz.getQuestions().size()` and the collected correct
 * indices — so all are tightened.
 *
 * `correctAnswers` is the correct option index per question, which means submitting reveals
 * the answer key. That is the backend's design, not something the UI can withhold.
 */
export type QuizResult = Required<Schemas['QuizResultResponseDto']>;
