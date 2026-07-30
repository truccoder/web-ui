/** Query keys for `features/reputation`, all under one namespace. */
export const reputationKeys = {
  all: ['reputation'] as const,
  user: (userId: number) => ['reputation', 'user', userId] as const,
};
