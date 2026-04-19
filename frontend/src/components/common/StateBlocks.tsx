export function LoadingBlock({ label }: { label: string }) {
  return <div className="state loading">Loading {label}...</div>;
}

export function ErrorBlock({ label }: { label: string }) {
  return <div className="state error">{label}</div>;
}

export function EmptyBlock({ label }: { label: string }) {
  return <div className="state empty">{label}</div>;
}
