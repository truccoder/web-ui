import { describe, expect, it } from 'vitest';
import { liftExplanationEnvelope } from './explanation-envelope';
import type { Explanation } from '../types/knowledge';

/**
 * The case this exists for: `explanationContent` arrives as the model's unparsed JSON envelope
 * (B40). Everything else asserts the function keeps its hands off a normal answer.
 */

function base(overrides: Partial<Explanation> = {}): Explanation {
  return {
    id: null,
    version: null,
    createdAt: null,
    postId: 1,
    originalContent: 'a post about kubernetes memory limits',
    explanationContent: null,
    concepts: null,
    prerequisites: null,
    complexityScore: null,
    category: null,
    externalLinks: null,
    referencedNotes: null,
    ...overrides,
  };
}

describe('liftExplanationEnvelope', () => {
  it('unwraps a raw JSON envelope and restores real newlines', () => {
    const result = liftExplanationEnvelope(
      base({
        explanationContent:
          '{ "explanation": "Bài đăng này thảo luận về Kubernetes.\\n\\n* **Memory limit**: một khuyến nghị." }',
      })
    );
    expect(result.explanationContent).toBe(
      'Bài đăng này thảo luận về Kubernetes.\n\n* **Memory limit**: một khuyến nghị.'
    );
  });

  it('unwraps an envelope wrapped in a ```json fence', () => {
    const result = liftExplanationEnvelope(
      base({
        explanationContent: '```json\n{"explanation": "Nội dung thật ở đây."}\n```',
      })
    );
    expect(result.explanationContent).toBe('Nội dung thật ở đây.');
  });

  it('lifts sibling fields only where the DTO field is empty', () => {
    const result = liftExplanationEnvelope(
      base({
        explanationContent: JSON.stringify({
          explanation: 'body',
          concepts: ['request vs limit', 'OOMKill'],
          prerequisites: ['cgroups'],
          complexityScore: 3,
          category: 'devops',
          externalLinks: [{ title: 'Docs', url: 'https://kubernetes.io', reason: 'reference' }],
        }),
        // Backend already resolved this one — keep it.
        concepts: ['already here'],
      })
    );
    expect(result.concepts).toEqual(['already here']);
    expect(result.prerequisites).toEqual(['cgroups']);
    expect(result.complexityScore).toBe(3);
    expect(result.category).toBe('DEVOPS');
    expect(result.externalLinks).toEqual([
      { title: 'Docs', url: 'https://kubernetes.io', reason: 'reference' },
    ]);
  });

  it('keeps a real backend category over the envelope, but replaces the OTHER default', () => {
    const kept = liftExplanationEnvelope(
      base({
        explanationContent: '{"explanation": "x", "category": "FRONTEND"}',
        category: 'BACKEND',
      })
    );
    expect(kept.category).toBe('BACKEND');

    const replaced = liftExplanationEnvelope(
      base({
        explanationContent: '{"explanation": "x", "category": "BACKEND"}',
        category: 'OTHER',
      })
    );
    expect(replaced.category).toBe('BACKEND');
  });

  it('leaves a normal markdown answer untouched', () => {
    const answer = base({
      explanationContent: '## Vì sao\n\nBộ nhớ là tài nguyên **không nén được**.',
      concepts: ['memory'],
    });
    expect(liftExplanationEnvelope(answer)).toBe(answer);
  });

  it('leaves an answer that merely starts with a brace but is not JSON', () => {
    const answer = base({ explanationContent: '{this is not json} but prose follows' });
    expect(liftExplanationEnvelope(answer)).toBe(answer);
  });

  it('leaves valid JSON that has no explanation-shaped key', () => {
    const answer = base({ explanationContent: '{"foo": "bar"}' });
    expect(liftExplanationEnvelope(answer)).toBe(answer);
  });

  it('is safe on a null / empty body', () => {
    const nullBody = base({ explanationContent: null });
    expect(liftExplanationEnvelope(nullBody)).toBe(nullBody);
    const emptyBody = base({ explanationContent: '   ' });
    expect(liftExplanationEnvelope(emptyBody)).toBe(emptyBody);
  });
});
