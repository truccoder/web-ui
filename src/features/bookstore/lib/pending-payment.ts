/**
 * ---------------------------------------------------------------------------------------------
 * THE PAYMENT THE APP WOULD OTHERWISE FORGET THE MOMENT IT STARTED ONE.
 * ---------------------------------------------------------------------------------------------
 *
 * `POST /payments/books/{id}` answers with a `transactionRef`, and that ref is the ONLY handle on
 * the payment afterwards: `syncPaymentStatus` takes it, MoMo sends it back as `orderId`, and the
 * backend has no endpoint that lists a buyer's orders (`PaymentController` is create / webhook /
 * sync-by-ref, and `BookPurchaseRepository` has no list query). Until this module existed the ref
 * lived in a mutation result and was thrown away one line later, when the button assigned
 * `window.location.href`. Everything that follows from that was a dead end:
 *
 *   - Pay the QR on your phone, close the tab, and no surface in the app can ask about it again.
 *   - Press Buy a second time and the backend answers 400 "A payment for this book is already in
 *     progress (orderId=...). Please complete it, or try again in a few minutes if it expired." —
 *     which was the app's ONLY payment-status surface, and it was a sentence you cannot click.
 *
 * So the browser remembers what the backend will not list. This is a convenience record, never a
 * source of truth: the truth is `POST /payments/{ref}/sync`, which is server-side and checks the
 * caller owns the ref. Nothing here grants access to anything; the worst a forged entry can do is
 * make this browser ask about a ref that answers 404.
 *
 * WHY NOT REDUX. The store is wiped on reload, and the whole point is surviving the round trip to
 * MoMo — which in the wallet flow is a full page navigation, and in the phone flow may be a tab
 * that never comes back at all.
 *
 * IT IS NOT KEYED BY USER, AND THAT IS SAFE BUT WORTH KNOWING. A second account signing in on the
 * same browser inherits the entries; every one of them answers 404 on sync, which is the one error
 * the waiting screen treats as "drop it". It self-heals in one poll rather than needing a hook
 * into the logout teardown, which lives in `core/` and must not import a feature.
 */

/** One payment this browser started and has not seen finish. */
export interface PendingPayment {
  /** Which book was being bought — what lets a book's own Buy button find its payment. */
  bookId: number;
  /** The backend's own order id. MoMo echoes it back as the `orderId` query parameter. */
  transactionRef: string;
  /**
   * MoMo's hosted page for this order, when we were the ones who opened it. `null` for a ref
   * recovered from a rejection, and genuinely nullable even on our own creations — the backend
   * reads it out of MoMo's response map.
   */
  paymentUrl: string | null;
  /** `Date.now()` when this browser learned about the ref. */
  startedAt: number;
  /**
   * TRUE MEANS THE AGE ABOVE IS A LOWER BOUND, NOT A MEASUREMENT. A recovered ref was read out of
   * the backend's 400; the attempt it names was started at some unknown earlier moment, up to the
   * full stale window ago. So a recovered entry may claim to be fresh long after MoMo's order has
   * expired, and no surface may use it to HIDE the Buy button — see `book-purchase-button.tsx`,
   * which keeps Buy standing beside it for exactly this reason.
   */
  recovered: boolean;
}

/**
 * How long an entry is worth showing.
 *
 * Mirrors two backend constants that are kept in step with each other:
 * `MomoService.PENDING_PAYMENT_STALE_MINUTES` (how long a PENDING row holds its ref against a
 * retry) and `MomoProperties.orderExpireMinutes` (what MoMo is told the order's life is). Both are
 * 15. This side cannot enforce either — it only decides when to stop offering a stale link.
 */
export const PENDING_PAYMENT_TTL_MS = 15 * 60 * 1000;

const STORAGE_KEY = 'nx.bookstore.pending-payments';

/**
 * `localStorage` is absent during server render and THROWS rather than returning null in a browser
 * configured to block site data, so both are handled here once instead of at every call site.
 */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isPendingPayment(value: unknown): value is PendingPayment {
  if (value == null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.bookId === 'number' &&
    typeof v.transactionRef === 'string' &&
    typeof v.startedAt === 'number' &&
    (v.paymentUrl === null || typeof v.paymentUrl === 'string')
  );
}

/**
 * Read the stored list, dropping anything that is not shaped like an entry.
 *
 * EXPORTED FOR ITS TEST, AND BECAUSE IT IS THE PART THAT MEETS UNTRUSTED INPUT. `localStorage` is
 * writable by anything running on this origin and outlives any one version of this code, so the
 * parse cannot assume its own writes are what it reads back — a hand-edited entry, or one written
 * by an older shape of this module, must be dropped rather than handed to a component that will
 * read `.transactionRef` off it.
 */
export function parsePendingPayments(raw: string | null): PendingPayment[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPendingPayment).map((entry) => ({
      bookId: entry.bookId,
      transactionRef: entry.transactionRef,
      paymentUrl: entry.paymentUrl ?? null,
      startedAt: entry.startedAt,
      // An entry written before this flag existed has an unknown provenance, and "recovered" is
      // the conservative reading of unknown: it is the branch that keeps Buy on screen.
      recovered: entry.recovered !== false,
    }));
  } catch {
    return [];
  }
}

/** Whether an entry is still inside the window MoMo keeps its order payable. */
export function isPendingPaymentFresh(entry: PendingPayment, now = Date.now()): boolean {
  return now - entry.startedAt < PENDING_PAYMENT_TTL_MS;
}

/** When an entry stops being worth offering — what the waiting screen counts down to. */
export function pendingPaymentExpiresAt(entry: PendingPayment): number {
  return entry.startedAt + PENDING_PAYMENT_TTL_MS;
}

/**
 * Pull the order id out of the backend's "already in progress" rejection.
 *
 * READING A MESSAGE'S TEXT IS NORMALLY FORBIDDEN HERE — `shared/lib/api-error` says so in full,
 * and it is right: a status is a contract, a sentence is not, and 400 on this endpoint also covers
 * "this book is free" and "cannot purchase your own book". This is not a translation of the
 * message and does not branch the copy shown to the reader; the rejection is still displayed
 * verbatim. It only lifts a ref out of the one sentence that carries one, and a rephrase costs
 * exactly the recovery shortcut — no state is entered wrongly, nothing is hidden, and the reader
 * ends up with the same message they had before this existed.
 *
 * The shape is `(orderId=MOMO1787752475445-ffa1853)`, built by string concatenation in
 * `MomoService.createPayment`, so the id runs to the closing parenthesis.
 */
export function extractOrderId(message: string): string | null {
  const match = /orderId=([^)\s]+)/.exec(message);
  return match ? match[1] : null;
}

/* ------------------------------------------------------------------------------------------- *
 * The store. `useSyncExternalStore` needs a snapshot that is referentially stable between calls,
 * so the parsed list is cached against the raw string it came from: same string, same array.
 * Re-parsing on every render would hand React a new array each time and loop forever.
 * ------------------------------------------------------------------------------------------- */

const EMPTY: PendingPayment[] = [];

let cachedRaw: string | null = null;
let cachedList: PendingPayment[] = EMPTY;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Subscribe to changes, including ones made in ANOTHER TAB.
 *
 * The second tab matters here more than usual: the buy flow deliberately opens MoMo in a tab of
 * its own, so the tab that finishes a payment is routinely not the tab showing the book.
 */
export function subscribePendingPayments(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Every remembered payment, newest first. Stable between calls while storage is unchanged. */
export function getPendingPayments(): PendingPayment[] {
  const raw = storage()?.getItem(STORAGE_KEY) ?? null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parsePendingPayments(raw).sort((a, b) => b.startedAt - a.startedAt);
  }
  return cachedList;
}

/** The server render's answer: nothing is remembered, because nothing can be read. */
export function getPendingPaymentsServerSnapshot(): PendingPayment[] {
  return EMPTY;
}

function write(next: PendingPayment[]) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A blocked or full quota costs the recovery shortcut, not the payment: the MoMo tab is still
    // open and the backend still settles the order either way. Nothing to report to the buyer.
  }
  emit();
}

/**
 * Remember a payment, replacing whatever was held for the same book.
 *
 * ONE ENTRY PER BOOK, because the backend has one purchase row per (book, buyer) — a second
 * attempt reuses that row and takes over its `transaction_ref`, which makes the previous ref
 * unreconcilable. Keeping both would offer the buyer a link to an order that no longer exists.
 *
 * Stale entries are pruned on the way past: this is the only moment the list is written, and
 * pruning during a render is not allowed.
 */
export function rememberPendingPayment(entry: PendingPayment) {
  const now = Date.now();
  const kept = getPendingPayments().filter(
    (existing) => existing.bookId !== entry.bookId && isPendingPaymentFresh(existing, now)
  );
  write([entry, ...kept]);
}

/** Drop one ref — because it settled, or because the backend says it is not ours. */
export function forgetPendingPayment(transactionRef: string) {
  const current = getPendingPayments();
  const next = current.filter((entry) => entry.transactionRef !== transactionRef);
  if (next.length !== current.length) write(next);
}
