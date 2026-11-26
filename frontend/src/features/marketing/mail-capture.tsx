export function MailCapture() {
  return (
    <div className="capture" aria-hidden="true">
      <div className="capture-folders">
        <p className="strong">Inbox</p>
        <p className="muted">Sent</p>
        <p className="muted">Drafts</p>
      </div>
      <div className="capture-list">
        <article>
          <p className="strong">Priya Shah</p>
          <p>DNS records are live</p>
        </article>
        <article>
          <p>Kavya Nair</p>
          <p className="muted">Move the review to 4?</p>
        </article>
      </div>
      <div className="capture-read">
        <p className="strong">DNS records are live</p>
        <p className="muted">Priya Shah</p>
        <p>Ownership, MX, SPF, and DKIM checked out. You can send from northwind.example.</p>
      </div>
    </div>
  );
}
