import { useCallback, useEffect, useState } from 'react';

const DISMISS_AFTER_MS = 4000;

export function useComingSoon() {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((featureName: string) => setMessage(`${featureName} is coming soon.`), []);
  const dismiss = useCallback(() => setMessage(null), []);
  return { message, show, dismiss };
}

export default function ComingSoonToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(onDismiss, DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (message === null) return null;
  return (
    <div className="toast coming-soon-toast" role="status">
      {message}
    </div>
  );
}
