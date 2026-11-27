import { useEffect, useState } from 'react';

export type Route =
  | { name: 'my-work' }
  | { name: 'create-defect' }
  | { name: 'defect'; id: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path === '/defects/new') return { name: 'create-defect' };
  const defect = /^\/defects\/([^/]+)$/.exec(path);
  if (defect) return { name: 'defect', id: decodeURIComponent(defect[1]) };
  return { name: 'my-work' };
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return parseRoute(hash);
}

export const defectHref = (id: string) => `#/defects/${encodeURIComponent(id)}`;
