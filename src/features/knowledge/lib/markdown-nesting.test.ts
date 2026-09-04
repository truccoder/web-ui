import { describe, expect, it } from 'vitest';
import { fixSingleSpaceNesting } from './markdown-nesting';

describe('fixSingleSpaceNesting', () => {
  it('bumps a one-space nested bullet to two so remark-gfm nests it', () => {
    const src = ['* Point one', ' * an analogy under it', '* Point two'].join('\n');
    expect(fixSingleSpaceNesting(src)).toBe(
      ['* Point one', '  * an analogy under it', '* Point two'].join('\n')
    );
  });

  it('handles - and + markers and ordered items', () => {
    expect(fixSingleSpaceNesting(' - child')).toBe('  - child');
    expect(fixSingleSpaceNesting(' + child')).toBe('  + child');
    expect(fixSingleSpaceNesting(' 2. child')).toBe('  2. child');
    expect(fixSingleSpaceNesting(' 3) child')).toBe('  3) child');
  });

  it('leaves a top-level bullet and an already-nested one alone', () => {
    const src = ['* top', '  * already two spaces', '    * four'].join('\n');
    expect(fixSingleSpaceNesting(src)).toBe(src);
  });

  it('does not touch a single space that is not a list marker', () => {
    expect(fixSingleSpaceNesting(' just an indented line')).toBe(' just an indented line');
    expect(fixSingleSpaceNesting(' *emphasis* not a bullet')).toBe(' *emphasis* not a bullet');
  });

  it('leaves lines inside a fenced code block untouched', () => {
    const src = ['```sh', ' * this is shell output', '```', ' * this is a real bullet'].join('\n');
    expect(fixSingleSpaceNesting(src)).toBe(
      ['```sh', ' * this is shell output', '```', '  * this is a real bullet'].join('\n')
    );
  });
});
