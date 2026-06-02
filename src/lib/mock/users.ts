function b64(obj: object): string {
  return btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeFakeJwt(payload: object): string {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(payload);
  const sig = b64({ mock: true });
  return `${header}.${body}.${sig}`;
}

export interface MockUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  profilePictureUrl: string;
  accessToken: string;
  refreshToken: string;
}

const now = () => Math.floor(Date.now() / 1000);
const FAR_FUTURE = 9999999999;

const RAW_USERS = [
  {
    id: 'mock-user-001',
    email: 'alice@test.com',
    password: 'Test1234!',
    fullName: 'Alice Johnson',
    profilePictureUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice',
  },
  {
    id: 'mock-user-002',
    email: 'bob@test.com',
    password: 'Test1234!',
    fullName: 'Bob Smith',
    profilePictureUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob',
  },
  {
    id: 'mock-user-003',
    email: 'carol@test.com',
    password: 'Test1234!',
    fullName: 'Carol Williams',
    profilePictureUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=carol',
  },
];

export const MOCK_USERS: MockUser[] = RAW_USERS.map((u) => ({
  ...u,
  accessToken: makeFakeJwt({
    sub: u.id,
    name: u.fullName,
    email: u.email,
    profilePictureUrl: u.profilePictureUrl,
    iat: now(),
    exp: FAR_FUTURE,
  }),
  refreshToken: makeFakeJwt({
    sub: u.id,
    type: 'refresh',
    iat: now(),
    exp: FAR_FUTURE,
  }),
}));

export function findMockUser(email: string, password: string): MockUser | null {
  return (
    MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    ) ?? null
  );
}
