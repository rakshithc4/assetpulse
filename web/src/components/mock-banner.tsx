/**
 * Visible on every page whenever the app runs on its built-in sample data (mock mode),
 * so nobody mistakes the hosted demo for a live SAP connection. Server component:
 * NEXT_PUBLIC_MOCK_MODE is inlined at build time.
 */
export function MockBanner() {
  if (process.env.NEXT_PUBLIC_MOCK_MODE !== '1') return null;
  return (
    <div
      role="status"
      className="shrink-0 border-b border-surface-raised bg-surface-panel px-4 py-1.5 text-center text-xs text-content-secondary"
    >
      <span className="font-medium text-content-primary">Demo mode</span> — sample data. Backend built and tested on SAP
      BTP ABAP Environment.
    </div>
  );
}
