import { useEffect } from 'react';
import { useBlocker } from 'react-router';

/**
 * Warns users when navigating away with unsaved changes.
 * Handles both in-app navigation (React Router) and browser navigation (beforeunload).
 */
export function useUnsavedChanges(isDirty: boolean) {
  // Browser tab close / external navigation
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // In-app SPA navigation
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm('You have unsaved changes. Leave anyway?');
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);
}
