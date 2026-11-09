import { Link, useParams } from 'react-router-dom';
import { EmptyState, Icon, Loading } from '../components/ui';
import { getBackend } from '../lib/backend';
import type { GuidanceArticle as Article } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export default function GuidanceArticle() {
  const { slug = '' } = useParams();
  const article = useAsync<Article | null>(() => getBackend().getGuidanceArticle(slug), [slug]);

  if (article.loading) return <Loading label="Opening note…" />;

  if (article.error) {
    return <EmptyState icon="x" title="Could not open this note" message={article.error} />;
  }

  if (!article.data) {
    return (
      <EmptyState
        icon="book"
        title="Note not found"
        message="This guidance note may have been moved or unpublished."
        action={
          <Link className="btn btn-outline btn-sm" to="/guidance">
            Back to guidance
          </Link>
        }
      />
    );
  }

  const item = article.data;
  const paragraphs = item.body.split(/\n{2,}/).filter(Boolean);

  return (
    <article className="stack gap-16">
      <Link className="btn btn-ghost btn-sm" to="/guidance" style={{ alignSelf: 'flex-start' }}>
        <Icon name="chevron" size={14} /> All guidance
      </Link>

      <header>
        <div className="meta-row">
          <span className="badge badge-brand">{item.category}</span>
          <span className="tiny muted nowrap">
            <Icon name="clock" size={12} /> {item.readMinutes} min read
          </span>
        </div>
        <h1 className="h1 mt-8">{item.title}</h1>
        <p className="lead">{item.excerpt}</p>
      </header>

      <div className="card card-pad-lg">
        <div className="stack gap-12">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="small" style={{ lineHeight: 1.75 }}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className="notice">
        <Icon name="sparkle" size={16} />
        <span>
          These notes offer reflection and companionship, not medical, legal or financial advice. For clinical concerns,
          please speak with a qualified professional.
        </span>
      </div>
    </article>
  );
}
