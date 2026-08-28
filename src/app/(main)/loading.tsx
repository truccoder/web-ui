import { Card, Skeleton } from '@/shared/components';

/**
 * What the canvas shows while a route under `(main)` is still arriving.
 *
 * THE PROBLEM IT SOLVES IS MEASURED, NOT IMAGINED. `docs/demo-script.md` opens by telling the
 * presenter to run a production build rather than `next dev`, because the first navigation into
 * a route can spend **over fifteen seconds** compiling — and the reason that is worth a warning
 * in a demo script is that the screen showed *nothing at all* for those seconds. Next only paints
 * a fallback where it finds a `loading.tsx`; with no file, the previous route simply sits there
 * and then swaps. That is indistinguishable from a click that did not register, and the usual
 * response to it is a second click.
 *
 * It matters in production too, for a smaller number: every one of these routes fetches its own
 * data on mount, so the gap between the navigation and the first row is real even when nothing
 * is compiling.
 *
 * THREE CARDS, NOT A SPINNER, and `Skeleton.prompt.md` is explicit about that: *"mirror the final
 * layout — never a full-page spinner."* The routes under this shell are card columns — a feed, a
 * list of projects, a profile stack — so three cards with a header row and a paragraph is the
 * shape they all land in. It is deliberately generic: a per-route skeleton is worth building when
 * a route's shape is distinctive enough that a wrong guess would be jarring, and none of these are
 * yet.
 *
 * A SERVER COMPONENT WITH NO HOOKS AND NO TEXT. It renders while the route is loading, so it must
 * not itself need anything to load — and `Skeleton` is `aria-hidden`, so there is no copy here to
 * translate. Screen readers get the route's real content when it arrives; announcing "loading" on
 * every navigation would be noise.
 */
export default function MainLoading() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((row) => (
        <Card key={row}>
          <div className="flex flex-col gap-3">
            {/* The identity row every card in this product opens with: avatar, name, meta. */}
            <div className="flex items-center gap-2.5">
              <Skeleton circle height={36} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton width="38%" height={12} />
                <Skeleton width="22%" height={10} />
              </div>
            </div>

            <Skeleton lines={3} height={12} />
          </div>
        </Card>
      ))}
    </div>
  );
}
