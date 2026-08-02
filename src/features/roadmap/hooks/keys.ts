/**
 * Query keys for `features/roadmap`, all under one namespace.
 *
 * TWO BRANCHES, AND THEY DO NOT INVALIDATE EACH OTHER. `roadmaps`/`nodes` describe the catalogue
 * (what tracks and skills exist); `pendingVerifications` is the moderator queue (who claimed
 * what). Approving a claim does not add or remove a node, and adding a node does not change any
 * claim — so a shared prefix would only refetch things that provably cannot have moved. Same
 * reasoning `features/knowledge` records for its three branches.
 *
 * `nodes` is keyed BY ROADMAP because the endpoint is per roadmap. There is no "all nodes"
 * request to key, and `nodesAll` exists purely so a write can sweep every roadmap's node list
 * without knowing which ones have been fetched — react-query matches invalidations by prefix.
 */
export const roadmapKeys = {
  all: ['roadmap'] as const,

  /** Every roadmap. One unpaginated request, so there is nothing to vary the key on. */
  roadmaps: ['roadmap', 'roadmaps'] as const,

  /** Prefix over every roadmap's node list — what a node write invalidates. */
  nodesAll: ['roadmap', 'nodes'] as const,

  /** The nodes of one roadmap. */
  nodes: (roadmapId: number) => ['roadmap', 'nodes', roadmapId] as const,

  /**
   * The moderator queue (`PENDING_APPROVAL` rows).
   *
   * Unfiltered and unpaginated on the backend, so — unlike the event attendee list — there is no
   * status to put in the key. If a filter is ever added there, it belongs here too.
   */
  pendingVerifications: ['roadmap', 'pending-verifications'] as const,
};
