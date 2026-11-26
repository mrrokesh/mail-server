# Client setup

Last updated: 2026-11-26 · v0.1.0

IMAP, POP3, and SMTP submission are on Starter and above. Free uses the web app and the mobile app. Clients use a per-device app password, not the account password.

The hostnames below are the intended production names. Local ports are in [local-dev.md](./local-dev.md). Nothing is accepting customer mail yet.

| Protocol           | Port | Security     |
| ------------------ | ---- | ------------ |
| SMTP submission    | 587  | STARTTLS     |
| SMTPS              | 465  | Implicit TLS |
| IMAPS              | 993  | Implicit TLS |
| POP3S              | 995  | Implicit TLS |
| ManageSieve        | 4190 | Implicit TLS |
| CalDAV and CardDAV | 443  | HTTPS        |

ActiveSync and EWS start at Business. JMAP for third-party clients is on Starter and above, through the API, not by talking to the mail engine directly.
