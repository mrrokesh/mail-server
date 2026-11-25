import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/use-document-title';

export function SecurityPage() {
  useDocumentTitle('Security');

  return (
    <article className="section">
      <div className="container stack-6">
        <header className="stack">
          <h1 className="h1">How mail stays safe</h1>
          <p className="measure">
            The controls below are part of the product. This page does not claim a certification we
            have not published.
          </p>
        </header>
        <section className="stack">
          <h2 className="h2">Records that prove the domain</h2>
          <p className="measure">
            Sending waits until ownership, MX, SPF, DKIM, and DMARC check out. MTA-STS and TLS
            reports are in the same wizard. A failed check names the code and the next edit.
          </p>
          <Link className="btn btn-text" to="/docs/deliverability">
            Read deliverability
          </Link>
        </section>
        <section className="stack">
          <h2 className="h2">Remote images stay off</h2>
          <p className="measure">
            Message HTML is shown in a sandboxed frame. Pictures from other sites stay blocked until
            the reader asks. IMAP and SMTP clients use an app password, not the account password.
          </p>
          <Link className="btn btn-text" to="/docs/client-setup">
            Read client setup
          </Link>
        </section>
        <section className="stack">
          <h2 className="h2">India, by default</h2>
          <p className="measure">
            Mail is stored in India by default. Another region is an Enterprise option later, not a
            switch on this screen.
          </p>
          <Link className="btn btn-primary" to="/signup">
            Create workspace
          </Link>
        </section>
      </div>
    </article>
  );
}
