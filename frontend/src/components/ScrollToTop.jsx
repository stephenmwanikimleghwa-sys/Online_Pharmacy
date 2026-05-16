import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — resets the scrollable content area to the top on every route
 * change and also scrolls the window. Works with the layout's inner overflow
 * div that is identified by the data-scroll-root attribute.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll the window
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Also scroll the inner overflow container used in App.jsx
    const root = document.querySelector('[data-scroll-root]');
    if (root) root.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
