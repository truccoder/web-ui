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
 * One roadmap (a learning track).
 *
 * `id` and `name` ALWAYS ARRIVE. `RoadmapService.getAllRoadmaps` sets all three fields from a
 * persisted entity, so `id` is assigned and `name` is `@NotBlank` on the way in. `description` is
 * genuinely nullable — no constraint on it anywhere, measured as `null` on a created row.
 *
 * `createRoadmap` echoes back the REQUEST DTO with the new id patched into it, not a re-read of
 * the entity. Harmless today because the entity stores exactly what was sent, but it means the
 * response is the caller's own input rather than the database's opinion of it.
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
