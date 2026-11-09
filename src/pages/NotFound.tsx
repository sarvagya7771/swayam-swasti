import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <EmptyState
      icon="search"
      title="Page not found"
      message="The page you were looking for may have moved. Your sessions and reflections are safe."
      action={
        <Link className="btn btn-primary btn-sm" to="/">
          Back to home
        </Link>
      }
    />
  );
}
