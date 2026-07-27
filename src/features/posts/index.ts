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

export { postsApi, locationApi, quizApi, commentsApi, reactionsApi } from './api';

export {
  PostComposer,
  type PostComposerProps,
  LocationPicker,
  type LocationPickerProps,
  LocationBadge,
  locationLabel,
  type LocationBadgeProps,
  CodeSnippetFields,
  type CodeSnippetFieldsProps,
  ArticleFields,
  type ArticleFieldsProps,
  QnaFields,
  PollFields,
  POLL_MIN_OPTIONS,
  type PollFieldsProps,
  LinkFields,
  isValidLinkUrl,
  type LinkFieldsProps,
  PostCard,
  type PostCardProps,
  type PostCardAuthor,
  CodeSnippetBody,
  type CodeSnippetBodyProps,
  ArticleBody,
  type ArticleBodyProps,
  LinkBody,
  type LinkBodyProps,
  QnaBody,
  type QnaBodyProps,
  PollBody,
  type PollBodyProps,
  BookBody,
  type BookBodyProps,
  type BookBodySummary,
  EventBody,
  type EventBodyProps,
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
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  groupComments,
  useMyReaction,
  useUpsertReaction,
  useRemoveReaction,
  type PostMutationOptions,
  type CreateBookPostVariables,
  type UpdatePostVariables,
  type AcceptAnswerVariables,
  type SubmitQuizVariables,
  type CommentThread,
  type CreateCommentVariables,
  type UpdateCommentVariables,
  type DeleteCommentVariables,
  type ReactionMutationOptions,
  type UpsertReactionVariables,
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
  PostComment,
  CreateCommentRequest,
  UpdateCommentRequest,
  ReactionType,
  MyReaction,
  UpsertReactionRequest,
} from './types';
