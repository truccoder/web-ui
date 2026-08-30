/**
 * `features/blocks` — mirrors the backend package `com.socialapp.blocks` (BlockController,
 * 3 endpoints). Single public barrel; everything outside imports from here.
 *
 * THE FEATURE THE APP NEVER HAD. The domain shipped in the 2026-08-09 backend batch and no
 * frontend surface consumed any of it, so blocking was a capability the product had and could not
 * be asked for.
 */

export { blockApi } from './api';
export { BlockedUsersList, BlockUserButton, type BlockUserButtonProps } from './components';
export { blockKeys, useBlockedUsers, useBlockUser, useUnblockUser } from './hooks';
export type { BlockedUser } from './types';
