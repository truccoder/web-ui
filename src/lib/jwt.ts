import type { JwtPayload, Profile } from '@/lib/types';

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function extractProfileFromToken(accessToken: string): Profile | null {
  const payload = decodeJwt(accessToken);
  if (!payload) return null;

  return {
    id: payload.sub,
    fullname: payload.fullname ?? '',
    profilePictureUrl: payload.profilePictureUrl ?? '',
  };
}
