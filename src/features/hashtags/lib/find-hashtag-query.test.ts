import { describe, expect, it } from 'vitest';
import { findHashtagQuery } from './find-hashtag-query';

/**
 * The `#` trigger the composer's typeahead opens on. It has to agree with the backend's own
 * `#(\w+)` extraction — a body character the dropdown accepts but the server would not is a
 * completed tag that silently never attaches to the post.
 */
describe('findHashtagQuery', () => {
  it('opens on a bare # at the start of the field', () => {
    expect(findHashtagQuery('#', 1)).toEqual({ start: 0, query: '' });
  });

  it('opens on a # right after whitespace and reports the partial body', () => {
    expect(findHashtagQuery('hello #re', 9)).toEqual({ start: 6, query: 're' });
  });

  it('does not open on a # that follows a non-space character', () => {
    expect(findHashtagQuery('example.com/#top', 16)).toBeNull();
    expect(findHashtagQuery('a#b', 3)).toBeNull();
  });

  it('closes once a space is typed after the tag', () => {
    expect(findHashtagQuery('#react ', 7)).toBeNull();
  });

  it('reads the tag under the caret, not one earlier in the line', () => {
    expect(findHashtagQuery('#react and #h', 13)).toEqual({ start: 11, query: 'h' });
  });

  it('stops the body at the first non-word character', () => {
    expect(findHashtagQuery('#c++', 4)).toBeNull();
  });
});
