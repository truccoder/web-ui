import { cn } from '@/shared/lib/cn';

/**
 * The surface every signed-out screen sits on — one decision, twelve call sites.
 *
 * IT IS A CARD ON A PHONE AND NOTHING AT ALL ON A DESKTOP, and that is the point. The auth
 * screens used to be `<Card padding={24}>` centred on an empty ground, which was right when the
 * card was the only thing on the viewport: it needed an edge because nothing else gave it one.
 *
 * The split layout gives it one. Above `lg` the left column IS the frame — a white half against
 * the brand panel's ink — so a 448-wide card floating inside a 713-wide white column is a box
 * drawn inside a box, and the reader sees two nested rectangles where there is one form. Below
 * `lg` the panel is not rendered, the ground is back to `surface-page`, and the card has to
 * return or the form would be loose text on grey.
 *
 * `[padding:24px]` RATHER THAN `Card`'s `padding` PROP, and the swap is what forced this
 * component to exist. `Card` writes padding as an inline style, and an inline style cannot be
 * undone by a `lg:` class — so there was no way to keep 24 on a phone and drop it on a desktop
 * while still going through `Card`. Written as an arbitrary property it is a class like any
 * other, and the responsive pair works.
 *
 * The 24 itself is unchanged and the reason for it is `LoginForm`'s, recorded when the canvas
 * cards moved to the DS default: a card alone on an empty viewport has no neighbouring block for
 * the ladder to relate it to, and the kit ships no auth specimen to measure. It stays where it
 * was rather than being guessed downward.
 */
export interface AuthCardProps {
  children?: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        'w-full text-nx-text-primary',
        'rounded-nx-md bg-nx-surface-card [padding:24px]',
        'lg:rounded-none lg:bg-transparent lg:[padding:0]',
        className
      )}
    >
      {children}
    </div>
  );
}
