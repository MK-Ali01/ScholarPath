interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty">{message}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="empty-state-action">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
