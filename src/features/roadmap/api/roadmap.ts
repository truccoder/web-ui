import api from '@/core/api/axios';
import type {
  CreatedRoadmapNode,
  CreateRoadmapInput,
  CreateRoadmapNodeInput,
  Roadmap,
  RoadmapNode,
} from '../types/roadmap';

/**
 * `RoadmapController` (`/v1/api/roadmaps`) — 4 endpoints, 4 functions.
 *
 * THE TWO WRITES ARE MEANT TO BE ADMIN-ONLY AND CURRENTLY ARE NOT. Both carry
 * `@PreAuthorize("hasRole('ADMIN')")`, but the backend never enables method security — there is
 * no `@EnableMethodSecurity` anywhere in `src/main/java`, and `SecurityConfig` only gates
 * `/v1/api/admin/**` at the URL level, which these paths are not under. Measured, not inferred: a
 * plain seed user created a roadmap and got **200**, and their JWT carries no role claim at all.
 *
 * They are still written and typed as admin operations, because that is what they are meant to be
 * and the gate is a one-line backend fix (raised as B20). What must NOT happen is the frontend
 * quietly building an authoring surface for everyone on the strength of a 200 — the state and UI
 * layers gate these behind the admin role the app already knows about, and the day the backend
 * turns its own gate on, nothing here changes.
 */
export const roadmapApi = {
  /**
   * GET /v1/api/roadmaps — every roadmap, unpaginated.
   *
   * `roadmapRepository.findAll()` with no page and no limit, so the whole table arrives in one
   * response. Fine at the current size (the table is EMPTY on a fresh dev database — there is no
   * roadmap seed) and worth remembering if it ever fills up.
   */
  getRoadmaps: () => api.get<Roadmap[]>('/v1/api/roadmaps').then((r) => r.data),

  /**
   * POST /v1/api/roadmaps — admin-only by intent; see the note above.
   *
   * A blank `name` is a **422 with per-field `details`**, not a 400: `@Valid` rejects it at the
   * controller so the service never runs. Measured on `{"name":"  "}`. Same shape as the empty
   * comment case elsewhere in this project — error handling should read `details`, not `message`.
   */
  createRoadmap: (payload: CreateRoadmapInput) =>
    api.post<Roadmap>('/v1/api/roadmaps', payload).then((r) => r.data),

  /**
   * GET /v1/api/roadmaps/{id}/nodes — the nodes of one roadmap.
   *
   * AN UNKNOWN ROADMAP IS NOT AN ERROR HERE. `getRoadmapNodes` queries by foreign key without
   * checking that the roadmap exists, so a bad id answers **200 with `[]`**, not 404 — measured
   * on id 999. A caller cannot tell "no such roadmap" from "roadmap with no nodes" and must not
   * try to; if it needs the distinction, it has to look the roadmap up in `getRoadmaps`.
   *
   * The order of the result is arbitrary — see the `orderIndex` note on `RoadmapNode`.
   */
  getRoadmapNodes: (roadmapId: number) =>
    api.get<RoadmapNode[]>(`/v1/api/roadmaps/${roadmapId}/nodes`).then((r) => r.data),

  /**
   * POST /v1/api/roadmaps/{id}/nodes — admin-only by intent; see the note above.
   *
   * A `parentNodeId` that does not exist is a 404 ("Parent node not found") — measured. One
   * belonging to a DIFFERENT roadmap is accepted; nothing checks that the parent is on this track.
   *
   * RETURNS `CreatedRoadmapNode`, NOT `RoadmapNode`, and the difference is not pedantry: the
   * response is the request DTO echoed back with two ids patched in, so a field the save
   * defaulted is still null here. Measured — posting `{"name":"n1"}` answers `"orderIndex": null`
   * while the read endpoint answers `0` for that same row. Re-fetch if you need the stored node.
   */
  createRoadmapNode: (roadmapId: number, payload: CreateRoadmapNodeInput) =>
    api
      .post<CreatedRoadmapNode>(`/v1/api/roadmaps/${roadmapId}/nodes`, payload)
      .then((r) => r.data),
};
