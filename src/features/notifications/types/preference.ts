import type { components } from '@/core/api/schema.gen';
import type { NotificationType } from './notification';

type Schemas = components['schemas'];

/**
 * Types for the preference half of NotificationController
 * (`GET`/`PUT /v1/api/notifications/preferences`), derived from `schema.gen.ts`.
 *
 * THE ENDPOINT RETURNED A JPA ENTITY UNTIL BE `39b5666` (QĐ-0002). It now returns
 * `NotificationPreferenceResponseDto`, which is the entity minus `onesignalPlayerId`. `updatedAt`
 * is still on the response and there is still no `id` — the DTO mirrors the table, which has
 * `@Id private Integer userId` and no generated key.
 *
 * `onesignalPlayerId` was dropped on purpose: the device token is minted by the client and pushed
 * up, so echoing it back served nothing while putting a push-capable handle in every settings
 * response. Nothing here read it.
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
 * EVERY FIELD ON THE RESPONSE, now that `onesignalPlayerId` is gone — there is no longer a
 * nullable one to exclude. Confirmed from `NotificationPreferenceEntity`,
 * `NotificationService.toDto` (a straight field-for-field copy) and
 * `V15__create_notifications_table.sql`:
 *   · `userId` — `@Id`, the primary key.
 *   · `pushEnabled` / `emailEnabled` / `emailFrequency` — `@Builder.Default` on the entity AND
 *     `DEFAULT` on the column, and the only insert path is
 *     `getOrCreatePreference`'s `builder().userId(userId).build()`.
 *   · `mutedTypes` — the getter is hand-written to return `List.of()` when the column is null,
 *     so the wire never carries null here; an empty array is the absence.
 *   · `updatedAt` — `@UpdateTimestamp`, written on insert as well as update.
 *
 * Kept as a named alias rather than inlined: the moment the backend adds a genuinely nullable
 * field to this response, the fix is to subtract it here, not to rewrite the mapped type below.
 */
type AlwaysPresent = keyof Schemas['NotificationPreferenceResponseDto'];

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
  [K in keyof Required<Schemas['NotificationPreferenceResponseDto']>]: K extends AlwaysPresent
    ? NonNullable<Schemas['NotificationPreferenceResponseDto'][K]>
    : Schemas['NotificationPreferenceResponseDto'][K] | null;
};

/**
 * Whether notification email goes out at all — `INSTANT` or `NONE`, nothing in between.
 *
 * NO LONGER A DEAD SETTING (BE `18efb6c`). It used to be stored, echoed back and read by nothing:
 * `shouldSendEmail` checked only `emailEnabled`, so a user asking for `NONE` still got mail on
 * every like. It is read now. At the same time `DAILY_DIGEST` and `WEEKLY_DIGEST` were **removed**
 * rather than implemented — no scheduler ever batched anything, and a setting that changes nothing
 * is worse than an absent one because the round trip looks like it worked.
 *
 * THE NARROWING IS ON THE REQUEST SIDE TOO, so sending a digest value is a runtime 400, not a
 * compile error somewhere upstream (measured by BE: `PUT {"emailFrequency":"WEEKLY_DIGEST"}` →
 * 400 "Malformed request body"). `V45__constrain_email_frequency.sql` adds a CHECK so the column
 * cannot hold one either.
 *
 * STILL NO UI CONTROL, and the reason has changed — see `notification-preferences.tsx`. With two
 * values left it would duplicate the `emailEnabled` switch, not add a choice.
 */
export type EmailFrequency = NonNullable<
  Schemas['NotificationPreferenceResponseDto']['emailFrequency']
>;

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
