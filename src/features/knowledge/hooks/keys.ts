/**
 * Query keys for `features/knowledge`, all under one namespace.
 *
 * Independent branches rather than one shared prefix, because almost nothing here invalidates
 * anything else: saving an explanation touches the library but not the profile or the tokens;
 * minting a token touches only the token list. The bookstore's grouped prefix existed because a
 * review genuinely moved three cached things at once — copying that shape here would invalidate
 * queries that cannot have changed. The one real dependency, notes → tags, is wired by hand in
 * `use-vault-notes` rather than by sharing a prefix, so it stays visible.
 */
export const knowledgeKeys = {
  all: ['knowledge'] as const,

  /** The professional profile that steers the explainer. */
  profile: ['knowledge', 'professional-profile'] as const,

  /** Personal access tokens for the external vault client. */
  tokens: ['knowledge', 'tokens'] as const,

  /** Saved explanations. */
  library: ['knowledge', 'library'] as const,

  /**
   * The notes the user's vault has synced up.
   *
   * A BRANCH OF ITS OWN, not a child of `tokens`, even though a token is what let the notes in.
   * Revoking a token does not remove a single note that was already pushed — the rows outlive the
   * credential — so hanging these off the token key would invalidate a list that cannot have
   * changed, and would suggest a cleanup that does not happen.
   */
  vaultNotes: ['knowledge', 'vault-notes'] as const,

  /**
   * The distinct tags across those notes, offered as filter choices.
   *
   * DERIVED FROM THE NOTES, so it is not `vaultSettings`' child and it does not stand alone either:
   * deleting notes can retire a tag, which is why the note mutations invalidate this too. Saving a
   * filter cannot change it — the tag list is what the vault contains, not what the filter selects.
   */
  vaultTags: ['knowledge', 'vault-tags'] as const,

  /**
   * Which tags admit a note to the AI's context.
   *
   * SEPARATE FROM `vaultNotes` in both directions. Saving a filter does not change a single note
   * row, and deleting a note does not change the filter — a rule naming a tag no note carries any
   * more is still the rule the user wrote, and silently dropping it would widen what the model
   * sees without saying so.
   */
  vaultSettings: ['knowledge', 'vault-settings'] as const,
};
