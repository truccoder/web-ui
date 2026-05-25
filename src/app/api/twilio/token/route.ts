import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY_SID,
  TWILIO_API_KEY_SECRET,
  TWILIO_CONVERSATIONS_SERVICE_SID,
  TWILIO_TWIML_APP_SID,
} = process.env;

export async function POST(request: NextRequest) {
  try {
    const { identity } = await request.json();

    if (!identity) {
      return NextResponse.json({ error: 'Identity is required' }, { status: 400 });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const AccessToken = twilio.jwt.AccessToken;
    const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, {
      identity,
      ttl: 3600,
    });

    // Conversations grant (chat)
    if (TWILIO_CONVERSATIONS_SERVICE_SID) {
      const conversationsGrant = new AccessToken.ChatGrant({
        serviceSid: TWILIO_CONVERSATIONS_SERVICE_SID,
      });
      token.addGrant(conversationsGrant);
    }

    // Video grant
    const videoGrant = new AccessToken.VideoGrant({});
    token.addGrant(videoGrant);

    // Voice grant
    if (TWILIO_TWIML_APP_SID) {
      const voiceGrant = new AccessToken.VoiceGrant({
        outgoingApplicationSid: TWILIO_TWIML_APP_SID,
        incomingAllow: true,
      });
      token.addGrant(voiceGrant);
    }

    return NextResponse.json({ token: token.toJwt() });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
