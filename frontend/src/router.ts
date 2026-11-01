import { useState, useEffect } from 'react';

export function navigate(path: string) {
  const currentFullPath = window.location.pathname + window.location.search;
  if (currentFullPath !== path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

export function useCurrentPath() {
  const [path, setPath] = useState<string>(() => window.location.pathname.toLowerCase());

  useEffect(() => {
    const onLocationChange = () => {
      setPath(window.location.pathname.toLowerCase());
    };

    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  return [path, navigate] as const;
}
