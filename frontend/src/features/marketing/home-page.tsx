import { Link } from 'react-router-dom';
import { MailCapture } from './mail-capture';
import { useDocumentTitle } from '../../lib/use-document-title';

export function HomePage() {
  useDocumentTitle('MR Rokesh Mail');

  return (
    <>
      <section className="hero section">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-copy">
          <p className="muted">Business email</p>
          <h1 className="display">Mail on your domain</h1>
          <p className="measure">
            Business email, calendar, and contacts for the address you already own. Hosted in India.
            Prices are in rupees and include GST.
          </p>
          <div className="cluster">
            <Link className="btn btn-primary btn-pill" to="/signup">
              Start free
            </Link>
            <Link className="btn btn-text" to="/pricing">
              See pricing
            </Link>
          </div>
        </div>
        <div className="container">
          <MailCapture />
        </div>
      </section>
      <section className="section reveal">
        <div className="container section-copy">
          <h2 className="h2">Your name, your mail</h2>
          <p className="measure">
            Add the domain you already use. The wizard checks ownership, MX, SPF, DKIM, DMARC, and
            MTA-STS, then names the record that still needs a fix.
          </p>
          <Link className="btn btn-text" to="/docs/dns-setup">
            Read DNS setup
          </Link>
        </div>
      </section>
      <section className="section reveal">
        <div className="container section-copy">
          <h2 className="h2">The day, in three panes</h2>
          <p className="measure">
            Mail, calendar, and contacts share one workspace. Folders, the list, and the reading
            pane stay quiet. On a phone they open one at a time.
          </p>
          <Link className="btn btn-text" to="/docs/what-you-can-do">
            See what you can do
          </Link>
        </div>
      </section>
      <section className="section reveal">
        <div className="container section-copy">
          <h2 className="h2">One console for admins</h2>
          <p className="measure">
            Owners invite people and read the same DNS checks the mailbox uses. Free includes owner
            settings. The fuller console starts at Starter.
          </p>
          <Link className="btn btn-text" to="/docs/roles-and-permissions">
            Read roles
          </Link>
        </div>
      </section>
      <section className="section reveal">
        <div className="container section-copy">
          <h2 className="h2">Five plans, tax included</h2>
          <p className="measure">
            Free, Starter, Business, Business Plus, and Enterprise. Annual and month-to-month prices
            are both on the pricing page, with GST included.
          </p>
          <Link className="btn btn-text" to="/pricing">
            See pricing
          </Link>
        </div>
      </section>
    </>
  );
}
