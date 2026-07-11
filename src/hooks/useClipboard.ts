import { useState, useCallback } from 'react';

interface ClipboardResult {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
  error: Error | null;
}

export const useClipboard = (resetDelay = 2000): ClipboardResult => {
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(async (text: string) => {
    if (!navigator?.clipboard) {
      const err = new Error('Clipboard API is not supported by this browser.');
      setError(err);
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);
      
      setTimeout(() => {
        setCopied(false);
      }, resetDelay);
      
      return true;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to copy text.');
      setError(e);
      setCopied(false);
      return false;
    }
  }, [resetDelay]);

  return { copied, copy, error };
};

export default useClipboard;
