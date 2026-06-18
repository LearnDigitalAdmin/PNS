import { useSite } from '../context/SiteContext';

export default function Lightbox() {
  const { lightboxSrc, closeLightbox } = useSite();

  return (
    <div
      id="lightbox"
      onClick={closeLightbox}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: lightboxSrc ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,.96)',
      }}
    >
      <button
        onClick={closeLightbox}
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'white', fontSize: '2rem', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        &times;
      </button>
      {lightboxSrc && (
        <img
          loading="lazy"
          decoding="async"
          src={lightboxSrc}
          alt=""
          style={{ maxWidth: '90%', maxHeight: '90vh', objectFit: 'contain' }}
        />
      )}
    </div>
  );
}
