import type { ChatMessage } from '../types/chat';

/**
 * Where a message sits inside a run of consecutive messages from the same person.
 *
 * Messenger UIs round the outer corners of a run and square the inner ones, so a burst of five
 * messages reads as one block rather than five cards. That needs each bubble to know its place in
 * the run, which is what this computes.
 */
export type MessagePosition = 'single' | 'first' | 'middle' | 'last';

export function getMessagePosition(messages: ChatMessage[], index: number): MessagePosition {
  const sender = messages[index]?.senderId;
  const previousSame = index > 0 && messages[index - 1]?.senderId === sender;
  const nextSame = index < messages.length - 1 && messages[index + 1]?.senderId === sender;

  if (!previousSame && !nextSame) return 'single';
  if (!previousSame) return 'first';
  if (!nextSame) return 'last';
  return 'middle';
}
