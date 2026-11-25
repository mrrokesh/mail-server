import { ERROR_CODES } from '@mrrokesh/shared';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../lib/use-document-title';

export function NotFoundPage() {
  useDocumentTitle('Not found');
  return (
    <article className="section">
      <div className="container stack">
        <h1 className="h1">We could not find that</h1>
        <p>
          {ERROR_CODES['API-RES-404'].message} <span className="caption">API-RES-404</span>
        </p>
        <p>{ERROR_CODES['API-RES-404'].action}</p>
        <Link className="btn btn-primary" to="/">
          Go to home
        </Link>
      </div>
    </article>
  );
}
