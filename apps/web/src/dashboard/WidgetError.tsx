export default function WidgetError({
  title,
  hint,
  onRetry,
}: {
  title: string;
  hint: string;
  onRetry: () => void;
}) {
  return (
    <div className="alert alert-danger tile-error" role="alert">
      <div>
        <strong>{title}</strong>
        <p className="hint" style={{ color: 'inherit' }}>
          {hint}
        </p>
      </div>
      <button className="btn btn-secondary" type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
