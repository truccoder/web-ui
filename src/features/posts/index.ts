/**
 * `features/posts` — mirrors the backend package `com.socialapp.posts` (PostController,
 * LocationController, QuizController, CommentController, PostReactionController and
 * EventController: 22 endpoints). One module, one barrel; the checkpoint schedule splits
 * into three cycles but the folder never does (CLAUDE.md §4).
 *
 * Cycle 1 (P2.4a) — core: post CRUD + accept-answer, location resolution, quiz submit.
 * Cycle 2 (P2.4′) — comments + reactions. Cycle 3 (P2.4″) — events.
 *
 * NOTE: this domain is **write-only**. There is no `GET /posts` and no `GET /posts/{id}` —
 * posts are read through `newsfeed` and `search`, which embed the post payload.
 */

export { postsApi, locationApi, quizApi } from './api';

export {
  PostComposer,
  type PostComposerProps,
  LocationPicker,
  type LocationPickerProps,
  LocationBadge,
  locationLabel,
  type LocationBadgeProps,
} from './components';

export {
  postKeys,
  useCreatePost,
  useCreateBookPost,
  useUpdatePost,
  useDeletePost,
  useAcceptAnswer,
  useResolveLocation,
  useSubmitQuiz,
  type PostMutationOptions,
  type CreateBookPostVariables,
  type UpdatePostVariables,
  type AcceptAnswerVariables,
  type SubmitQuizVariables,
} from './hooks';

export type {
  PostType,
  PostVisibility,
  LocationType,
  LocationDetails,
  EventDetails,
  CodeSnippetDetails,
  ArticleDetails,
  QnaDetails,
  PollDetails,
  LinkDetails,
  QuizQuestion,
  QuizDetails,
  CreateBookRequest,
  CreatePostRequest,
  UpdatePostRequest,
  LocationResolutionRequest,
  LocationResolution,
  SubmitQuizRequest,
  QuizResult,
} from './types';
