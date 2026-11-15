/** The masthead band that opens every index and profile page. */
export function PageHead({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="wrap py-10 sm:py-14">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="t-h1 mt-4 text-ink">{title}</h1>
        {lead && <p className="t-lead mt-4 max-w-2xl">{lead}</p>}
        {children}
      </div>
    </header>
  );
}
