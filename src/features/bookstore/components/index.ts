export { BookActions, type BookActionsProps } from './book-actions';
export { BookPurchaseButton, type BookPurchaseButtonProps } from './book-purchase-button';
export { BookRatingSummary, type BookRatingSummaryProps } from './book-rating-summary';
// `BookReaderDialog` is DELIBERATELY NOT EXPORTED. It is an internal of `BookActions`, which loads
// it through `next/dynamic({ ssr: false })` because `react-pdf` evaluates `DOMMatrix` at module
// scope. Re-exporting it here would put that static path back into every server bundle importing
// this barrel and break the production build again — which is exactly what happened once.
export { BookReviewForm, type BookReviewFormProps } from './book-review-form';
export { BookReviewList, type BookReviewListProps } from './book-review-list';
export { PaymentResultPanel, type PaymentResultPanelProps } from './payment-result-panel';
export { StarRating, type StarRatingProps } from './star-rating';
