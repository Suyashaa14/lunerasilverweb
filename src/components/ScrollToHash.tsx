import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.slice(1);
    const scroll = () => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    };

    if (scroll()) return;
    const timer = setTimeout(scroll, 50);
    return () => clearTimeout(timer);
  }, [location.pathname, location.hash, location.key]);

  return null;
}
