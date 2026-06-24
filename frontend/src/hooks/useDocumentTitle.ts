import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — Transcounty Pharmacy` : 'Transcounty Pharmacy';
    return () => {
      document.title = previous;
    };
  }, [title]);
}
