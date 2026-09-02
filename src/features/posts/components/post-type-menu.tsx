'use client';

import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Code2,
  FileText,
  HelpCircle,
  Link2,
  MessageSquare,
} from 'lucide-react';
import { Menu } from '@/shared/components';
import { useT } from '@/core/i18n';
import type { PostType } from '../types/post';

/**
 * "Which kind of post" — the list, and the menu that offers it.
 *
 * IT WAS INLINE IN `PostComposer` AND NOW HAS TWO CALLERS, which is the whole reason it moved.
 * `/newsfeed`'s sticky filter bar grew a compose button once the composer card started scrolling
 * away, and that button opens the same list: press it, pick `Câu hỏi`, land in the question form.
 * The alternative was the page reaching into `posts` for `PostType` values and building its own
 * copy of the list — a second place for the order, the icons and the `REGULAR` rule to drift, in
 * a file that has no business knowing what kinds of post exist (CLAUDE.md §4).
 *
 * `REGULAR` LEADS THE LIST, SEPARATED FROM THE REST, and `SWITCHABLE_TYPES` deliberately excludes
 * it (see R4-4): the chip row this menu replaced could only ever render the kinds you were NOT on,
 * so it had no way back to a plain post. The menu has room to say it, and it is now the only way
 * back — which is why it sits above the rule rather than in the run.
 *
 * IT IS FILTERED BY `current` LIKE EVERY OTHER KIND, which the inline version did not do: the old
 * list printed `Trạng thái` at the top even while the composer was already on `REGULAR`, so the
 * common case — the composer's own default — opened a menu whose first row and whose separator
 * both did nothing. One rule for all eight kinds is shorter to state and shorter to read.
 *
 * `current` IS OPTIONAL, AND THE TWO CALLERS WANT DIFFERENT ANSWERS. The composer passes it,
 * because its trigger already NAMES the current kind — offering it again would be a row that does
 * nothing visible. The feed bar passes nothing: its trigger is one icon that names no kind, so
 * every kind is on the list, including `REGULAR`.
 */
export const POST_TYPE_ICONS: Record<PostType, ReactNode> = {
  REGULAR: <MessageSquare />,
  CODE_SNIPPET: <Code2 />,
  ARTICLE: <FileText />,
  QNA: <HelpCircle />,
  POLL: <BarChart3 />,
  LINK: <Link2 />,
  BOOK: <BookOpen />,
  EVENT: <Calendar />,
};

/** Kinds the composer can actually produce, in switcher order. `REGULAR` is the default state. */
const SWITCHABLE_TYPES = [
  'CODE_SNIPPET',
  'ARTICLE',
  'QNA',
  'POLL',
  'LINK',
  'BOOK',
  'EVENT',
] as const;

export interface PostTypeMenuProps {
  /** The kind already chosen. Omitted from the list when given — see the header. */
  current?: PostType;
  /**
   * PICKING A KIND IS EXPECTED TO OPEN THE FORM, in the same gesture. Splitting the two would
   * make choosing `Câu hỏi` do nothing visible — the panel that asks for the question would be
   * behind a second click nobody was told about. Both callers honour that.
   */
  onSelect: (type: PostType) => void;
  /** The control that opens the panel: the composer's named button, the feed bar's icon. */
  trigger: ReactElement<HTMLAttributes<HTMLElement>>;
  /** @default "start" */
  align?: 'start' | 'end';
  /** @default 220 */
  width?: number;
  /**
   * Render the panel into `document.body`. Set it when an ancestor clips overflow — `/newsfeed`'s
   * filter bar is a `StickyBlock`, whose `overflow-hidden` cut the panel down to a sliver.
   */
  portal?: boolean;
  className?: string;
}

export function PostTypeMenu({
  current,
  onSelect,
  trigger,
  align = 'start',
  width = 220,
  portal = false,
  className,
}: PostTypeMenuProps) {
  const t = useT();

  return (
    <Menu
      align={align}
      width={width}
      portal={portal}
      className={className}
      trigger={trigger}
      items={[
        ...(current === 'REGULAR'
          ? []
          : [
              {
                label: t('createPost.type.REGULAR'),
                icon: POST_TYPE_ICONS.REGULAR,
                onSelect: () => onSelect('REGULAR'),
              },
              '-' as const,
            ]),
        ...SWITCHABLE_TYPES.filter((type) => type !== current).map((type) => ({
          label: t(`createPost.type.${type}`),
          icon: POST_TYPE_ICONS[type],
          onSelect: () => onSelect(type),
        })),
      ]}
    />
  );
}
