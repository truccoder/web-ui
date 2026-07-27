export { PostComposer, type PostComposerProps } from './post-composer';
export { LocationPicker, type LocationPickerProps } from './location-picker';
export { LocationBadge, locationLabel, type LocationBadgeProps } from './location-badge';

// Per-kind composer fields (P2.4c-3). Exported individually as well as through the composer so
// the edit flow in cycle 2 can reuse them instead of growing a second copy.
export { CodeSnippetFields, type CodeSnippetFieldsProps } from './code-snippet-fields';
export { ArticleFields, type ArticleFieldsProps } from './article-fields';
export { QnaFields } from './qna-fields';
export { PollFields, POLL_MIN_OPTIONS, type PollFieldsProps } from './poll-fields';
export { LinkFields, isValidLinkUrl, type LinkFieldsProps } from './link-fields';

// Book + quiz (P2.4c-4). The book fields feed `POST /posts/books`; the quiz is an attachment
// that any kind may carry, which is why it is exported on its own rather than as a kind.
export {
  BookPostFields,
  BOOK_FILE_EXTENSIONS,
  BOOK_FILE_MAX_BYTES,
  bookFileExtension,
  type BookPostFieldsProps,
} from './book-post-fields';
export {
  QuizComposer,
  QUIZ_MIN_OPTIONS,
  emptyQuiz,
  emptyQuizQuestion,
  isQuizReady,
  normalizeQuiz,
  type QuizComposerProps,
} from './quiz-composer';

// Read side (P2.4'c-1). The card is the surface every other cycle-2 interaction attaches to,
// so it ships before the reaction bar and the comment thread that fill its slots.
export { PostCard, type PostCardProps, type PostCardAuthor } from './post-card';

// Type-specific bodies for the read side (P2.4'c-1'a). Each fills `PostCard`'s `body` slot;
// the card never switches on `postType` itself. Poll / book / event follow in c-1'b.
export { CodeSnippetBody, type CodeSnippetBodyProps } from './code-snippet-body';
export { ArticleBody, type ArticleBodyProps } from './article-body';
export { LinkBody, type LinkBodyProps } from './link-body';
export { QnaBody, type QnaBodyProps } from './qna-body';
export { PollBody, type PollBodyProps } from './poll-body';
export { BookBody, type BookBodyProps, type BookBodySummary } from './book-body';
export { EventBody, type EventBodyProps } from './event-body';

// Reaction row (P2.4'c-2) — fills `PostCard`'s `actions` slot.
export { ReactionBar, type ReactionBarProps } from './reaction-bar';

// Comment thread (P2.4'c-3) — also fills `PostCard`'s `actions` slot.
export { CommentThread, type CommentThreadProps } from './comment-thread';
export { CommentItem, type CommentItemProps } from './comment-item';
export { CommentComposer, type CommentComposerProps } from './comment-composer';

// Cycle-1 debt paid (P2.4'c-4): the four endpoints that needed a rendered post to attach to.
export { QuizTaker, type QuizTakerProps } from './quiz-taker';
export { PostEditor, type PostEditorProps, type PostEditorState } from './post-editor';
export { PostMenu, type PostMenuProps } from './post-menu';

// Event controls (P2.4″c) — both fill `EventBody`'s `actions` slot. Split in two because
// they are separate concerns with separate failure modes: RSVP writes participation state
// the backend owns, while the calendar pair hands the user a file or talks to Google.
export { EventRsvpBar, type EventRsvpBarProps } from './event-rsvp-bar';
export { EventCalendarActions, type EventCalendarActionsProps } from './event-calendar-actions';
export { EventFields, type EventFieldsProps } from './event-fields';
