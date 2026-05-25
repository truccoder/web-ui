export async function fetchTwilioToken(identity: string): Promise<string> {
  const response = await fetch('/api/twilio/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Twilio token');
  }

  const data = await response.json();
  return data.token;
}
