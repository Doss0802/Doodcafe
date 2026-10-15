/**
 * Bridges frontend Vite client with Express API backend across environments (Dev, Render, Hostinger).
 * Relative paths stored in PostgreSQL (e.g. '/images/Quick Bites/French fries.jpeg', '/uploads/...')
 * are prepended with the backend API origin so the browser requests them directly from the Express server.
 */
export const resolveImageUrl = (rawSrc) => {
  if (!rawSrc) return '';
  if (
    rawSrc.startsWith('http://') ||
    rawSrc.startsWith('https://') ||
    rawSrc.startsWith('data:') ||
    rawSrc.startsWith('blob:')
  ) {
    return rawSrc;
  }

  const envApi = import.meta.env.VITE_API_URL;
  let API_BASE = '';
  if (envApi && envApi.startsWith('http')) {
    API_BASE = envApi.replace(/\/api\/?$/, '');
  } else if (!envApi && import.meta.env.DEV) {
    API_BASE = 'http://localhost:5000';
  } else if (envApi && !envApi.startsWith('http')) {
    API_BASE = '';
  }

  if (
    rawSrc.startsWith('/images/') ||
    rawSrc.startsWith('/src/images/') ||
    rawSrc.startsWith('/uploads/')
  ) {
    return `${API_BASE}${rawSrc}`;
  }

  // Vite local public directory assets (e.g., /quick-bites/...) pass through
  return rawSrc;
};

export default resolveImageUrl;
