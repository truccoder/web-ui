import { describe, expect, it } from 'vitest';
import { applyTaggedMentions, renderTaggedPlaceholders } from './tagged-mentions';

/**
 * `applyTaggedMentions` sits on the exact line `PostService.validateTags` checks: the request's
 * `content` must carry `@[0]`, `@[1]` … once each, in the same order as `taggedUserIds`. A wrong
 * order or a missing placeholder is a 400 the author cannot read their way out of, so the cases
 * here are the ones the composer actually produces.
 */
describe('applyTaggedMentions', () => {
  it('replaces picked @username tokens with ordered placeholders', () => {
    const out = applyTaggedMentions('hey @ada and @bob', [
      { username: 'ada', userId: 1 },
      { username: 'bob', userId: 2 },
    ]);
    expect(out.content).toBe('hey @[0] and @[1]');
    expect(out.taggedUserIds).toEqual([1, 2]);
  });

  it('orders placeholders by first appearance, not by pick order', () => {
    const out = applyTaggedMentions('@bob then @ada', [
      { username: 'ada', userId: 1 },
      { username: 'bob', userId: 2 },
    ]);
    expect(out.content).toBe('@[0] then @[1]');
    expect(out.taggedUserIds).toEqual([2, 1]);
  });

  it('drops a picked mention whose token was deleted from the text', () => {
    const out = applyTaggedMentions('only @ada here', [
      { username: 'ada', userId: 1 },
      { username: 'bob', userId: 2 },
    ]);
    expect(out.content).toBe('only @[0] here');
    expect(out.taggedUserIds).toEqual([1]);
  });

  it('leaves an unpicked @word as plain text', () => {
    const out = applyTaggedMentions('email me @notafriend', []);
    expect(out.content).toBe('email me @notafriend');
    expect(out.taggedUserIds).toEqual([]);
  });

  it('de-dupes by userId', () => {
    const out = applyTaggedMentions('@ada @ada', [
      { username: 'ada', userId: 1 },
      { username: 'ada', userId: 1 },
    ]);
    expect(out.content).toBe('@[0] @[0]');
    expect(out.taggedUserIds).toEqual([1]);
  });

  it('matches a mention at the start of the string', () => {
    const out = applyTaggedMentions('@ada hi', [{ username: 'ada', userId: 1 }]);
    expect(out.content).toBe('@[0] hi');
  });
});

describe('renderTaggedPlaceholders', () => {
  it('substitutes names back for the preview card', () => {
    expect(renderTaggedPlaceholders('hey @[0] and @[1]', ['Ada', 'Bob'])).toBe('hey @Ada and @Bob');
  });

  it('leaves a placeholder with no name untouched', () => {
    expect(renderTaggedPlaceholders('hey @[0]', [])).toBe('hey @[0]');
  });
});
