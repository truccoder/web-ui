import { describe, expect, it } from 'vitest';
import {
  emptyPositionDraft,
  isPositionDraftEmpty,
  isPositionDraftValid,
  positionToDraft,
  toPositionRequest,
  validatePositionDraft,
  type PositionDraft,
} from './position-form';

/**
 * The client-side half of `ProjectPositionRequestDTO`'s validation (BE `V105`). The point of these
 * checks is that a person sees what they are missing at the field, so 422 from the server is only
 * ever a safety net — the three cases the JD plan calls out by name (summary under 40, a single
 * responsibility line, no skills) each get an assertion here.
 */

const valid = (): PositionDraft => ({
  title: 'Kỹ sư Backend',
  roleSummary:
    'Xây và vận hành các dịch vụ thanh toán chịu tải cao, viết đủ dài để qua mốc bốn mươi ký tự.',
  responsibilities: ['Thiết kế API thanh toán', 'Trực sự cố theo ca'],
  requirements: ['3 năm với Java/Kotlin', 'Từng làm hệ thống giao dịch'],
  niceToHave: ['Biết Kafka'],
  requiredSkills: ['Kotlin', 'PostgreSQL'],
  minYearsExperience: '3',
  seniorityLevel: 'SENIOR',
  quantity: 2,
});

describe('validatePositionDraft', () => {
  it('passes a fully filled role', () => {
    expect(validatePositionDraft(valid())).toEqual({});
    expect(isPositionDraftValid(valid())).toBe(true);
  });

  it('flags a role summary under 40 characters', () => {
    expect(validatePositionDraft({ ...valid(), roleSummary: 'Quá ngắn' }).roleSummary).toBe(
      'summaryTooShort'
    );
  });

  it('flags a missing role summary', () => {
    expect(validatePositionDraft({ ...valid(), roleSummary: '   ' }).roleSummary).toBe(
      'summaryRequired'
    );
  });

  it('flags fewer than two responsibility lines', () => {
    expect(
      validatePositionDraft({ ...valid(), responsibilities: ['Chỉ một dòng', ''] }).responsibilities
    ).toBe('listTooFew');
  });

  it('flags fewer than two requirement lines', () => {
    expect(validatePositionDraft({ ...valid(), requirements: ['', ''] }).requirements).toBe(
      'listTooFew'
    );
  });

  it('flags a role with no skills', () => {
    expect(validatePositionDraft({ ...valid(), requiredSkills: [] }).requiredSkills).toBe(
      'skillsRequired'
    );
    expect(validatePositionDraft({ ...valid(), requiredSkills: ['  '] }).requiredSkills).toBe(
      'skillsRequired'
    );
  });

  it('flags an over-long list item', () => {
    expect(
      validatePositionDraft({
        ...valid(),
        responsibilities: ['a'.repeat(301), 'Trực sự cố'],
      }).responsibilities
    ).toBe('listItemTooLong');
  });

  it('flags too many skills and an over-long skill', () => {
    expect(
      validatePositionDraft({
        ...valid(),
        requiredSkills: Array.from({ length: 21 }, (_, i) => `skill-${i}`),
      }).requiredSkills
    ).toBe('skillsTooMany');
    expect(
      validatePositionDraft({ ...valid(), requiredSkills: ['x'.repeat(61)] }).requiredSkills
    ).toBe('skillTooLong');
  });

  it('flags years of experience outside 0–50', () => {
    expect(validatePositionDraft({ ...valid(), minYearsExperience: '51' }).minYearsExperience).toBe(
      'yearsRange'
    );
    expect(validatePositionDraft({ ...valid(), minYearsExperience: '-1' }).minYearsExperience).toBe(
      'yearsRange'
    );
    expect(
      validatePositionDraft({ ...valid(), minYearsExperience: 'abc' }).minYearsExperience
    ).toBe('yearsRange');
    expect(
      validatePositionDraft({ ...valid(), minYearsExperience: '' }).minYearsExperience
    ).toBeUndefined();
  });
});

describe('isPositionDraftEmpty', () => {
  it('is true for a fresh draft and false once anything is typed', () => {
    expect(isPositionDraftEmpty(emptyPositionDraft())).toBe(true);
    expect(isPositionDraftEmpty({ ...emptyPositionDraft(), title: 'x' })).toBe(false);
    expect(isPositionDraftEmpty({ ...emptyPositionDraft(), requiredSkills: ['Kotlin'] })).toBe(
      false
    );
  });
});

describe('toPositionRequest', () => {
  it('trims rows, drops blanks and omits unset optionals', () => {
    const body = toPositionRequest({
      ...valid(),
      responsibilities: ['  Thiết kế API  ', '', 'Trực ca'],
      minYearsExperience: '',
      seniorityLevel: '',
      quantity: 0,
    });
    expect(body.responsibilities).toEqual(['Thiết kế API', 'Trực ca']);
    expect(body.minYearsExperience).toBeUndefined();
    expect(body.seniorityLevel).toBeUndefined();
    expect(body.quantity).toBeUndefined();
  });

  it('keeps a real quantity and years value', () => {
    const body = toPositionRequest({ ...valid(), quantity: 3, minYearsExperience: '5' });
    expect(body.quantity).toBe(3);
    expect(body.minYearsExperience).toBe(5);
  });
});

describe('positionToDraft', () => {
  it('pads short lists to the two-row minimum', () => {
    const draft = positionToDraft({
      title: 'Vai cũ',
      roleSummary: null as unknown as undefined,
      responsibilities: ['Một dòng'],
      requiredSkills: ['React'],
    });
    expect(draft.responsibilities).toEqual(['Một dòng', '']);
    expect(draft.requirements).toEqual(['', '']);
    expect(draft.roleSummary).toBe('');
  });
});
