import { useState, useCallback } from 'react';

export type SubmitStatus = 'idle' | 'sending' | 'sent';

/**
 * Mirrors the original vanilla submitForm(e, successId) pattern: on submit,
 * shows a brief "Sending..." state then flips to a success message and
 * resets the form. No backend call is made (this remains a front-end demo).
 */
export function useSimulatedSubmit(delayMs = 1200) {
  const [status, setStatus] = useState<SubmitStatus>('idle');

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      setStatus('sending');
      setTimeout(() => {
        setStatus('sent');
        form.reset();
      }, delayMs);
    },
    [delayMs]
  );

  const reset = useCallback(() => setStatus('idle'), []);

  return { status, handleSubmit, reset };
}
