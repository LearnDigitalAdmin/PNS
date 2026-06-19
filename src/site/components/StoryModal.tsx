import { useSite } from '../context/SiteContext';
import { renderMarkdown } from '../../lib/markdown';

export default function StoryModal() {
  const { storyModalData, closeStoryModal, openLightbox } = useSite();
  const story = storyModalData;

  if (!story) return null;

  return (
    <div className="modal active">
      <div className="modal-backdrop" onClick={closeStoryModal} />
      <div className="modal-box modal-box-dark story-modal-box">
        <button onClick={closeStoryModal} className="story-modal-close" aria-label="Close">
          &times;
        </button>

        {story.image && (
          <div className="story-modal-hero" onClick={() => openLightbox(story.image)} title="View full image">
            <img src={story.image} alt={story.title} loading="lazy" decoding="async" />
            <div className="story-modal-hero-overlay" />
          </div>
        )}

        <div className="story-modal-content">
          <span className="category-badge">{story.category}</span>
          <h2 className="story-modal-title">{story.title}</h2>

          {(story.author || story.date) && (
            <p className="story-modal-meta">
              {story.author}
              {story.author && story.date ? ' · ' : ''}
              {story.date}
            </p>
          )}

          {story.excerpt && <p className="story-modal-excerpt">{story.excerpt}</p>}

          {story.body ? (
            <div
              className="md-content story-modal-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(story.body) }}
            />
          ) : (
            <p className="story-modal-body-fallback">Full story coming soon.</p>
          )}

          {story.instagram && <p className="story-modal-instagram">📷 {story.instagram}</p>}
        </div>
      </div>
    </div>
  );
}