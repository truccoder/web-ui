import type { components } from '@/core/api/schema.gen';
import type { NotificationType } from './notification';

type Schemas = components['schemas'];

/**
 * Types for the preference half of NotificationController
 * (`GET`/`PUT /v1/api/notifications/preferences`), derived from `schema.gen.ts`.
 *
 * THE ENDPOINT RETURNS A JPA ENTITY, NOT A DTO. `getPreferences`/`updatePreferences` are typed
 * `NotificationPreferenceEntity` in the controller, so the wire shape is the table. That is why
 * `updatedAt` is on the response and there is no `id`.
 */

/**
 * FIXES A SHAPE THE LEGACY FE HAD WRONG (recorded at P0.3 in `ledger/legacy-inventory.md`):
 * `lib/types` declared `NotificationPreference.id: number` and omitted `updatedAt`. The entity
 * has neither an `id` nor a generated key — `@Id private Integer userId` — and it does carry
 * `@UpdateTimestamp private OffsetDateTime updatedAt`. Deriving from the schema rather than
 * porting the old type is what closes that gap; do not reintroduce `id`.
 */

/**
 * Fields the backend always sends with a real value.
 *
 * Everything except `onesignalPlayerId`, confirmed from `NotificationPreferenceEntity` and
 * `V15__create_notifications_table.sql`:
 *   · `userId` — `@Id`, the primary key.
 *   · `pushEnabled` / `emailEnabled` / `emailFrequency` — `@Builder.Default` on the entity AND
 *     `DEFAULT` on the column, and the only insert path is
 *     `getOrCreatePreference`'s `builder().userId(userId).build()`.
 *   · `mutedTypes` — the getter is hand-written to return `List.of()` when the column is null,
 *     so the wire never carries null here; an empty array is the absence.
 *   · `updatedAt` — `@UpdateTimestamp`, written on insert as well as update.
 *
 * `onesignal_player_id` is a plain nullable column and is null for every user until a browser
 * actually registers a push subscription.
 */
type AlwaysPresent = Exclude<keyof Schemas['NotificationPreferenceEntity'], 'onesignalPlayerId'>;

/**
 * A user's notification preferences.
 *
 * Same `| null`-not-`?:` rule as the rest of this feature — see `types/notification.ts` for why
 * that distinction is load-bearing rather than stylistic.
 *
 * `mutedTypes` is `string[]` and not `NotificationType[]` ON PURPOSE. The column is free-form
 * `jsonb` and `updatePreference` stores whatever list it is handed without validating it, so a
 * stale or hand-edited row can hold names that are not in the enum. `isTypeMuted` compares with
 * `List.contains(type.name())`, i.e. those junk entries simply never match. Narrowing the
 * response type would be a claim the backend does not enforce; the *request* type narrows
 * instead (see `UpdatePreferenceInput`), which is the side we control.
 */
export type NotificationPreference = {
  [K in keyof Required<Schemas['NotificationPreferenceEntity']>]: K extends AlwaysPresent
    ? NonNullable<Schemas['NotificationPreferenceEntity'][K]>
    : Schemas['NotificationPreferenceEntity'][K] | null;
};

/**
 * How often digest email should go out.
 *
 * DEAD SETTING AS OF TODAY — the value is stored and echoed back and read by nothing. No
 * `@Scheduled` job in the backend mentions `EmailFrequency` (the five schedulers that exist are
 * github sync, post scoring, reputation reconcile, token cleanup and trending crawl), and
 * `NotificationService.shouldSendEmail` checks only `emailEnabled`. So mail is sent instantly
 * whatever this says, `NONE` included. Anything the UI renders for it is a control that does
 * nothing; that has to be a stated deviation at P2.6cd, not a silent one.
 */
export type EmailFrequency = NonNullable<Schemas['NotificationPreferenceEntity']['emailFrequency']>;

/**
 * Body of `PUT /v1/api/notifications/preferences`.
 *
 * OPTIONAL KEYS ARE CORRECT HERE, and this is the one place in the feature where `?:` is not a
 * mistake. The rule against `?:` is about *responses*, where Jackson's `ALWAYS` inclusion means
 * a key is always on the wire. This is a *request*: `updatePreference` guards every field with
 * `Objects.nonNull(...)`, so an omitted key means "leave it alone" and the endpoint is a partial
 * update despite the `PUT`. Sending an explicit `null` is not a way to clear a field — it is
 * indistinguishable from omitting it.
 *
 * `mutedTypes` narrows to `NotificationType[]`: the backend mutes by comparing against
 * `NotificationType.name()`, so any other string is silently inert. Being loose on the way in
 * would let a caller write a preference that can never take effect.
 */
export type UpdatePreferenceInput = Omit<Schemas['UpdatePreferenceRequestDto'], 'mutedTypes'> & {
  mutedTypes?: NotificationType[];
};
