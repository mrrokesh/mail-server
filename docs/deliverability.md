# Deliverability

Last updated: 2026-11-26 · v0.1.0

Each customer domain gets:

- SPF with a single include for our outbound addresses, staying under 10 DNS lookups.
- DKIM with a 2048-bit RSA key, an optional Ed25519 second signature, and rotation at least every six months.
- DMARC starting in test mode, then moving from none to quarantine to reject. Aggregate reports at least daily once we receive them.
- ARC seals on forwarded mail and lists.
- MTA-STS with a hosted policy, TLS-RPT, and DANE TLSA records on our own MX hosts.
- BIMI only after DMARC is enforced.
- A PTR record that matches HELO for every outbound IP.

Outbound mail stays blocked until SPF and DKIM pass. Trial and free tenants use a separate IP pool. The product target is a Gmail spam rate under 0.1%, and it must not reach 0.3%. Bulk campaigns do not send from person mailboxes.
