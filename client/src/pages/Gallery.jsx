import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const photoModules = import.meta.glob(
  '/src/images/Cafe photos/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true, import: 'default' }
);

const PHOTOS = Object.entries(photoModules)
  .sort(([a], [b]) => {
    const fa = a.split('/').pop();
    const fb = b.split('/').pop();
    return fa.localeCompare(fb, undefined, { numeric: true, sensitivity: 'base' });
  })
  .map(([, url]) => url);

function FullscreenViewer({ src, onClose }) {
  useEffect(() => {
    // Push a history entry so the Android back button closes the viewer
    window.history.pushState({ galleryViewer: true }, '');

    const onPop = () => onClose();
    window.addEventListener('popstate', onPop);

    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="gallery-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Full-screen photo"
      onClick={onClose}
    >
      <img
        className="gallery-viewer-img"
        src={src}
        alt="Full-screen view"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="gallery-viewer-close"
        aria-label="Close photo viewer"
        onClick={onClose}
      >
        ✕
      </button>
    </div>,
    document.body
  );
}

export default function Gallery() {
  const [selected, setSelected] = useState(null);
  const [failed, setFailed] = useState(new Set());

  useEffect(() => {
    document.title = 'Gallery · Dood Cafe';
    return () => { document.title = 'Dood Cafe'; };
  }, []);

  const open = useCallback((url) => setSelected(url), []);
  const close = useCallback(() => setSelected(null), []);

  const markFailed = useCallback((url) => {
    setFailed((prev) => new Set([...prev, url]));
  }, []);

  return (
    <>
      <Navbar />
      <main className="gallery-page">
        <div className="container">
          <h1 className="page-title gallery-heading">Gallery</h1>
          <div className="gallery-grid">
            {PHOTOS.filter((url) => !failed.has(url)).map((url) => (
              <button
                key={url}
                className="gallery-thumb"
                onClick={() => open(url)}
                aria-label="Open photo"
                type="button"
              >
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => markFailed(url)}
                />
              </button>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      {selected && <FullscreenViewer src={selected} onClose={close} />}
    </>
  );
}
