'use client';

import { Plus, X } from 'lucide-react';
import { Button, Input, Select } from '@/shared/components';
import { useT } from '@/core/i18n';
import type { PollDetails } from '../types/post';

/**
 * `POLL` payload — `pollDetails: { question, options[], allowMultipleVotes, endDate }`.
 *
 * FINDING, RECORDED RATHER THAN HIDDEN: **the backend has no vote endpoint.** `PollDetails` is
 * written by create/update, embedded in `FeedPostDataDto` and search's `PostDto`, and read by
 * nothing else — there is no controller anywhere that mutates `PollOption.votesCount`
 * (`PostReactionController` handles reactions, not votes). A poll created here is therefore a
 * poll nobody can answer until the backend grows the endpoint. It is built anyway because
 * `pollDetails` is a real part of `createPost` and the coverage metric is per endpoint, but the
 * reader-side card (cycle 2) must not render clickable options that silently do nothing.
 *
 * `votesCount: 0` and sequential `id`s are sent because `PollOption` carries both and nothing
 * server-side fills them in — an option list with null ids has no stable key for the reader side
 * to vote against later. They are not fabricated data: zero votes on a brand-new poll is the
 * truth.
 *
 * `allowMultipleVotes` IS A SELECT, NOT A CHECKBOX, for two reasons. The design system does
 * specify a Checkbox, but adding it here would be a sixth new component in a checkpoint whose
 * announced ceiling is five (CLAUDE.md §5) — and "Single choice / Multiple choice" states the
 * actual consequence, where a box labelled "allow multiple votes" leaves the unchecked meaning
 * implicit. A shared Checkbox gets built when a form needs a real boolean, not squeezed in here.
 *
 * `endDate` is an `OffsetDateTime` on the wire while `datetime-local` yields an offset-less
 * string, so the two are converted at this boundary rather than anywhere downstream.
 */
export interface PollFieldsProps {
  value: PollDetails;
  onChange: (value: PollDetails) => void;
}

/** A poll needs at least this many options to mean anything. Frontend guard — BE validates none. */
export const POLL_MIN_OPTIONS = 2;
const POLL_MAX_OPTIONS = 10;

export function PollFields({ value, onChange }: PollFieldsProps) {
  const t = useT();
  const options = value.options ?? [];

  const setOption = (index: number, text: string) => {
    onChange({
      ...value,
      options: options.map((option, i) => (i === index ? { ...option, text } : option)),
    });
  };

  const addOption = () => {
    onChange({
      ...value,
      // Ids stay 1-based and contiguous over the list, so removing one renumbers the rest —
      // nothing has been persisted yet, so there is no id anyone else could be holding.
      options: [...options, { id: options.length + 1, text: '', votesCount: 0 }],
    });
  };

  const removeOption = (index: number) => {
    onChange({
      ...value,
      options: options.filter((_, i) => i !== index).map((option, i) => ({ ...option, id: i + 1 })),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        label={t('createPost.poll.question')}
        value={value.question ?? ''}
        onChange={(event) => onChange({ ...value, question: event.target.value })}
        placeholder={t('createPost.poll.questionPlaceholder')}
      />

      <div className="flex flex-col gap-2">
        <span className="text-nx-body-sm font-medium text-nx-text-primary">
          {t('createPost.poll.options')}
        </span>

        {options.map((option, index) => (
          <div key={option.id ?? index} className="flex items-center gap-2">
            <Input
              size="sm"
              value={option.text ?? ''}
              onChange={(event) => setOption(index, event.target.value)}
              placeholder={t('createPost.poll.optionPlaceholder', { index: index + 1 })}
              aria-label={t('createPost.poll.optionPlaceholder', { index: index + 1 })}
            />
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              icon={<X />}
              disabled={options.length <= POLL_MIN_OPTIONS}
              onClick={() => removeOption(index)}
              aria-label={t('createPost.poll.removeOption')}
            />
          </div>
        ))}

        {options.length < POLL_MAX_OPTIONS && (
          <Button
            size="sm"
            variant="secondary"
            className="self-start"
            icon={<Plus />}
            onClick={addOption}
          >
            {t('createPost.poll.addOption')}
          </Button>
        )}
      </div>

      {/* Two columns from the parent, not from `w-auto` on the children: `Input`/`Select` are
          `w-full` at their root and their `className` lands on the inner wrapper, so `w-auto`
          never reaches the element that sets the width. Same fix as `book-post-fields`. */}
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <Select
          size="sm"
          label={t('createPost.poll.mode')}
          value={value.allowMultipleVotes ? 'multiple' : 'single'}
          onChange={(event) =>
            onChange({ ...value, allowMultipleVotes: event.target.value === 'multiple' })
          }
          options={[
            { value: 'single', label: t('createPost.poll.modeSingle') },
            { value: 'multiple', label: t('createPost.poll.modeMultiple') },
          ]}
        />

        <Input
          size="sm"
          type="datetime-local"
          label={t('createPost.poll.endDate')}
          hint={t('createPost.poll.endDateHint')}
          value={value.endDate ? toLocalInput(value.endDate) : ''}
          onChange={(event) =>
            onChange({ ...value, endDate: toOffsetDateTime(event.target.value) })
          }
        />
      </div>
    </div>
  );
}

/** `OffsetDateTime` string → the `YYYY-MM-DDTHH:mm` shape `datetime-local` requires. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * `datetime-local` value → `OffsetDateTime`. The input carries no zone, so `new Date` reads it as
 * local time and `toISOString` re-expresses that same instant with an explicit `Z` offset.
 * Forwarding the bare string instead would leave the offset to Jackson's default and shift the
 * deadline by however far the user is from UTC.
 */
function toOffsetDateTime(local: string): string | undefined {
  if (!local) return undefined;
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}
