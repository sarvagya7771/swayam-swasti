import { Link } from 'react-router-dom';
import { EmptyState, Icon, Loading } from '../components/ui';
import { getBackend } from '../lib/backend';
import type { GuidanceArticle } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export default function Guidance() {
  const articles = useAsync<GuidanceArticle[]>(() => getBackend().listGuidance(), []);

  return (
    <div className="stack gap-20">
      <header>
        <p className="eyebrow">
          <Icon name="book" size={14} /> Guidance
        </p>
        <h1 className="h1">Notes for the inner life</h1>
        <p className="lead">
          Short, practical reflections on practice, charts and the rhythm of a spiritual life. Read at your own pace —
          nothing here asks anything of you.
        </p>
      </header>

      {articles.loading ? (
        <Loading label="Loading guidance…" />
      ) : articles.error ? (
        <EmptyState icon="x" title="Guidance unavailable" message={articles.error} />
      ) : (
        <div className="grid grid-2">
          {(articles.data ?? []).map((article) => (
            <Link className="row-link" to={`/guidance/${article.slug}`} key={article.id}>
              <article className="card" style={{ height: '100%' }}>
                <div className="meta-row">
                  <span className="badge badge-brand">{article.category}</span>
                  <span className="tiny muted nowrap">
                    <Icon name="clock" size={12} /> {article.readMinutes} min read
                  </span>
                </div>
                <h2 className="h3 mt-8">{article.title}</h2>
                <p className="small muted">{article.excerpt}</p>
                <span className="tiny grad-text nowrap">
                  Read note <Icon name="arrow" size={12} />
                </span>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
