/**
 * Bridges frontend Vite client (port 5174) with Express API backend (port 5000).
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

  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
    .replace(/\/api\/?$/, '');

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
