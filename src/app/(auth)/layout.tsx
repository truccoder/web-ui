export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Flat surface-page background, not the former blue/indigo gradient — constitution
  // §1.5 forbids decorative gradients (P0.5 DS deviation, resolved here).
  return (
    <div className="flex min-h-screen items-center justify-center bg-nx-surface-page p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
