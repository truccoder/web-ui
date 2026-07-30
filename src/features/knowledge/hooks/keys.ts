/**
 * Query keys for `features/knowledge`, all under one namespace.
 *
 * Three independent branches rather than one shared prefix, because nothing here invalidates
 * anything else: saving an explanation touches the library but not the profile or the tokens;
 * minting a token touches only the token list. The bookstore's grouped prefix existed because a
 * review genuinely moved three cached things at once — copying that shape here would invalidate
 * queries that cannot have changed.
 */
export const knowledgeKeys = {
  all: ['knowledge'] as const,

  /** The professional profile that steers the explainer. */
  profile: ['knowledge', 'professional-profile'] as const,

  /** Personal access tokens for the external vault client. */
  tokens: ['knowledge', 'tokens'] as const,

  /** Saved explanations. */
  library: ['knowledge', 'library'] as const,
};
