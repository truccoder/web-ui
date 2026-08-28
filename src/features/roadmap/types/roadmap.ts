import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for `RoadmapController` (`/v1/api/roadmaps`) and `SkillVerificationController`
 * (`/v1/api/skills`), derived from `schema.gen.ts`. BE package `com.socialapp.roadmap`.
 *
 * TWO CONTROLLERS, ONE FEATURE, because they are one package on the backend and CLAUDE.md §4
 * mirrors packages rather than URL prefixes. `/skills` looks like a separate area from
 * `/roadmaps` and is not: a skill verification is a claim about ONE ROADMAP NODE, so
 * `SkillVerificationRequestDto.nodeId` is a `RoadmapNodeDto.id` and neither half means anything
 * alone.
 *
 * EVERY TYPE BELOW IS A MAPPED TYPE OVER THE GENERATED SCHEMA, never a hand-written literal.
 * That is deliberate and is the difference between correcting the generator and replacing it: a
 * field renamed on the backend has to break these types at compile time, which it can only do if
 * the key set still comes from `Schemas`. What is corrected here is nullability alone — the
 * generator marks a field required only where a Java annotation forces it, and only the request
 * DTOs carry those (`@NotBlank name`, `@NotNull nodeId`/`tier`), so every response field arrives
 * optional and is re-tightened below against `RoadmapService` / `SkillVerificationService`.
 */

/** `VerificationTier` — how a claim on a node is being backed up. */
export type VerificationTier = NonNullable<Schemas['SkillVerificationRequestDto']['tier']>;

/**
 * What a track is ABOUT. BE `15090af`, migration V76.
 *
 * IT CLOSES ds-deviation #23. `RoadmapEntity` had three columns — id, name, description — and no
 * domain of any kind, which is why `RoadmapList` shipped as a flat list while the design system's
 * `skill-taxonomy.html` grouped tracks under a fixed set of domains: grouping would have meant
 * assigning tracks to categories the backend had never heard of. It has heard of them now, and the
 * five seeded tracks were labelled 1:1 in V79, so the filter draws on real data rather than on a
 * taxonomy invented on this side.
 *
 * NOT THE SAME SET AS THE DESIGN SYSTEM'S EIGHT. The kit lists Backend, Frontend, DevOps, Mobile,
 * AI/ML, Security, Cloud, Data; the backend enum has no `Cloud`, folds Data and AI/ML into one
 * `DATA_ML`, and adds `QA`, `CAREER` and `OTHER`. Where the two disagree the backend wins — it is
 * the set the rows are actually stored with.
 *
 * Declared per-feature; `bookstore`'s copy carries the note on why one backend enum has three
 * frontend declarations and one shared set of labels.
 */
export type LearningCategory = NonNullable<Schemas['RoadmapDto']['category']>;

/**
 * One roadmap (a learning track).
 *
 * `id` and `name` ALWAYS ARRIVE. `RoadmapService.getAllRoadmaps` sets all three fields from a
 * persisted entity, so `id` is assigned and `name` is `@NotBlank` on the way in. `description` is
 * genuinely nullable — no constraint on it anywhere, measured as `null` on a created row.
 *
 * `createRoadmap` echoes back the REQUEST DTO with the new id patched into it, not a re-read of
 * the entity. Harmless today because the entity stores exactly what was sent, but it means the
 * response is the caller's own input rather than the database's opinion of it.
 *
 * `category` IS THE ONE FIELD THAT ESCAPES THAT, and deliberately: the service reads it back off
 * the saved entity before answering, because a request that omits it is stored as `OTHER` and a
 * response echoing the caller's `null` would be telling them something untrue about their own row.
 * So it is `NonNullable` here on both paths — a created track and a listed one always name a
 * topic.
 */
export type Roadmap = {
  [K in keyof Required<Schemas['RoadmapDto']>]: K extends 'description'
    ? string | null
    : NonNullable<Schemas['RoadmapDto'][K]>;
};

/**
 * Body for `POST /v1/api/roadmaps`.
 *
 * The endpoint takes a whole `RoadmapDto`, `id` included; omitting it here is the point.
 * `createRoadmap` ignores an incoming id and overwrites it with the generated one, so accepting
 * it from a caller would be offering a field that cannot do anything.
 */
export type CreateRoadmapInput = Omit<Schemas['RoadmapDto'], 'id'>;

/**
 * One node in a roadmap — a single skill on the track.
 *
 * `parentNodeId` IS THE TREE, and it is the only thing that is. A node with no parent is a root;
 * `getRoadmapNodes` maps that case to `null` explicitly rather than omitting the key. Nothing on
 * the backend validates that a parent belongs to the SAME roadmap, so a consumer building the
 * tree must tolerate a parent id it cannot find among the nodes it was handed.
 *
 * `orderIndex` ALWAYS ARRIVES AND ORDERS NOTHING. `addNodeToRoadmap` defaults it to 0 when the
 * caller omits it, so the column is never null — but `RoadmapNodeRepository` declares a plain
 * `findByRoadmapId` with **no `OrderBy`**, so rows come back in whatever order the database
 * chose. Sorting is the CONSUMER's job; a UI that renders the array as received will look stable
 * in dev and reshuffle in production.
 */
export type RoadmapNode = {
  [K in keyof Required<Schemas['RoadmapNodeDto']>]: K extends 'description' | 'parentNodeId'
    ? Required<Schemas['RoadmapNodeDto']>[K] | null
    : NonNullable<Schemas['RoadmapNodeDto'][K]>;
};

/**
 * What `POST /v1/api/roadmaps/{id}/nodes` actually answers — WEAKER than a read node.
 *
 * `addNodeToRoadmap` does not re-read the saved entity. It patches `id` and `roadmapId` into the
 * REQUEST DTO it was handed and returns that, so any field the backend defaulted during the save
 * is still null in the response. Measured: posting `{"name":"n1"}` answers
 * `"orderIndex": null`, while `GET .../nodes` on the very same row answers `"orderIndex": 0`.
 *
 * A separate type rather than loosening `RoadmapNode`, because the read path really does
 * guarantee the field and the vast majority of consumers are on the read path. Collapsing the two
 * would make every list rendering pay for a defect that only the create response has. A caller
 * that needs the stored node after creating one should re-fetch rather than trust this.
 */
export type CreatedRoadmapNode = {
  [K in keyof Required<Schemas['RoadmapNodeDto']>]: K extends 'id' | 'roadmapId' | 'name'
    ? NonNullable<Schemas['RoadmapNodeDto'][K]>
    : Required<Schemas['RoadmapNodeDto']>[K] | null;
};

/**
 * Body for `POST /v1/api/roadmaps/{id}/nodes`.
 *
 * `roadmapId` is dropped alongside `id`: it travels in the path, and `addNodeToRoadmap`
 * overwrites whatever the body claimed with the path value.
 */
export type CreateRoadmapNodeInput = Omit<Schemas['RoadmapNodeDto'], 'id' | 'roadmapId'>;

/**
 * Body for `POST /v1/api/skills/verify`.
 *
 * Taken as generated — this is the one shape where the spec is already right, because `nodeId`
 * and `tier` carry `@NotNull` and the two proof fields really are optional.
 */
export type SkillVerificationInput = Schemas['SkillVerificationRequestDto'];

/**
 * `VerificationStatus` — where a claim stands. Only the owner ever sees the non-VERIFIED two.
 */
export type VerificationStatus = NonNullable<Schemas['RoadmapProgressDto']['status']>;

/**
 * One node a user has claimed, as returned by `GET /v1/api/users/{userId}/roadmap-progress`.
 *
 * THE CONTROLLER LIVES IN `com.socialapp.roadmap` DESPITE THE `/users/...` PATH, so it belongs to
 * this feature rather than to `security`. Same species of oddity as `PaymentController` sitting in
 * `bookstore` — mirror the package, note the surprise (CLAUDE.md §3/§4).
 *
 * WHAT THE VIEWER SEES DEPENDS ON WHO THEY ARE, and that is server-side, not a UI concern:
 * `getProgressForUser` filters to `VERIFIED` unless the viewer IS the user. So on the owner's own
 * profile the array can contain `PENDING_APPROVAL` and `REJECTED` rows, and on anyone else's it
 * cannot. A consumer must therefore render all three statuses rather than assuming everything it
 * receives is verified — the same array shape means different things to different callers.
 *
 * IT CLOSES B21. The ledger recorded "`findByUserId()` exists, controller missing" as the reason
 * `/profile` had no skills card; the controller now exists and the card is possible.
 *
 * `verifiedAt` IS NULL UNTIL A CLAIM IS ACTUALLY VERIFIED — a pending row has no verification
 * moment yet — while `nodeId`/`nodeName` come from a join that cannot miss and `status`/`tier` are
 * non-null columns. `RoadmapProgressDto.from` copies all five straight off the entity.
 *
 * NO PROOF LINK AND NO VERIFIER, deliberately: the endpoint is open to signed-out visitors (the
 * profile it belongs to is), so the DTO carries nothing that would leak who vouched for what.
 */
export type RoadmapProgress = {
  [K in keyof Required<Schemas['RoadmapProgressDto']>]: K extends 'verifiedAt'
    ? Required<Schemas['RoadmapProgressDto']>[K] | null
    : NonNullable<Schemas['RoadmapProgressDto'][K]>;
};

/**
 * One row in the moderator queue.
 *
 * EVERYTHING EXCEPT THE THREE PROOF/PICTURE FIELDS IS PRESENT. `SkillVerificationService.
 * toPendingDto` builds every row from an entity joined with its user and node
 * (`findByStatusWithUserAndNode`), so ids, names, tier and timestamp all come from non-null
 * columns. `proofUrl`, `proofImageKey` and `profilePictureUrl` are nullable in the database and
 * copied straight through.
 *
 * `tier` can only be `MOD_VERIFIED` or `QUIZ_VERIFIED` in practice, since those are the only two
 * that produce a `PENDING_APPROVAL` row — but the DTO is typed with the full enum and the backend
 * does not narrow it, so this does not either. Inventing a tighter type than the wire guarantees
 * is how a runtime value ends up with no branch to fall in.
 *
 * `requestedAt` is an `OffsetDateTime`, so it carries a zone and is safe for `new Date()`.
 */
export type PendingVerification = {
  [K in keyof Required<Schemas['PendingVerificationDto']>]: K extends
    | 'proofUrl'
    | 'proofImageKey'
    | 'profilePictureUrl'
    ? Required<Schemas['PendingVerificationDto']>[K] | null
    : NonNullable<Schemas['PendingVerificationDto'][K]>;
};
