/**
 * The address the Obsidian plugin has to be pointed at.
 *
 * IT IS A CONSTANT HERE BECAUSE NOTHING IN THE PRODUCT USED TO SAY IT ANYWHERE. A user could mint
 * a token, copy it, close the dialog and still have no idea what to paste it into — the token is
 * half a setup, and the other half is this URL. Both belong on the one screen the reader passes
 * through exactly once.
 *
 * Built from `NEXT_PUBLIC_API_URL`, the same base `core/api/axios` uses, so a deployment that
 * moves the API does not leave this screen quoting an address that stopped working.
 */
export const SYNC_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/v1/api/knowledge/sync`;
