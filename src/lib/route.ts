import { useEffect, useState } from 'react';

export const ROUTES = [
  'home',
  'plan',
  'timer',
  'exams',
  'quiz',
  'assistant',
  'stats',
  'settings',
  'bac',
  'library',
  'mindmap',
  'curriculum',
  'review',
  'cards',
  'simulator',
  'calc',
  'achievements',
  'reports',
  'more',
  'about',
  'help',
  'today',
] as const;
export type Route = (typeof ROUTES)[number];

function read(): Route {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return (ROUTES as readonly string[]).includes(h) ? (h as Route) : 'home';
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
