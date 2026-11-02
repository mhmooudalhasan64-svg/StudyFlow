import { useEffect, useState } from 'react';

export const ROUTES = ['home', 'plan', 'timer', 'exams', 'quiz', 'stats', 'settings'] as const;
export type Route = (typeof ROUTES)[number];

function read(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
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
