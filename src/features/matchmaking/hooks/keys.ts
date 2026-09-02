/**
 * Query keys for `features/matchmaking`.
 *
 * IT USED TO BE ONE KEY, "BECAUSE THERE IS ONE READ" — four of five endpoints were writes
 * returning `void` and nothing listed projects, positions or applications. There are four reads
 * now, and they share the `matchmaking` prefix so that an accept or a reject can invalidate all of
 * them at once: filling the last slot of a position changes the project read as well as the inbox,
 * and a `void` response cannot say whether it did.
 */
export const matchmakingKeys = {
  all: ['matchmaking'] as const,

  /** The browse list. `limit` is in the key because it changes the page shape. */
  projects: (limit: number) => ['matchmaking', 'projects', limit] as const,

  /** One project with its positions. */
  project: (projectId: number) => ['matchmaking', 'project', projectId] as const,

  /** The owner's inbox for one project. Never fetched by anyone else — it answers 403. */
  projectApplications: (projectId: number) =>
    ['matchmaking', 'project', projectId, 'applications'] as const,

  /**
   * The accepted-member roster for one project. Shares the `['matchmaking','project',id]` prefix
   * with `project` and `projectApplications` so a member removal — which also flips a position
   * back to `OPEN` and moves an application to `REMOVED` — is swept by one `all` invalidation.
   */
  projectMembers: (projectId: number) => ['matchmaking', 'project', projectId, 'members'] as const,

  /** What the signed-in account has applied to. */
  myApplications: ['matchmaking', 'my-applications'] as const,

  /** Ranked candidates for one position. `limit` is in the key for the same reason as `projects`. */
  suggestedCandidates: (positionId: number, limit: number) =>
    ['matchmaking', 'suggested-candidates', positionId, limit] as const,

  /** Projects ranked against the caller's own professional profile. */
  suggestedProjects: (limit: number) => ['matchmaking', 'suggested-projects', limit] as const,
};
