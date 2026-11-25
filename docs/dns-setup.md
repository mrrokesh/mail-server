# DNS setup

Last updated: 2026-11-26 · v0.1.0

A domain is ready to send only after ownership and the mail records check out. The wizard will offer Cloudflare and Domain Connect where the customer grants a narrow token, and copy-paste records otherwise.

Records the wizard will ask for:

| Record                      | Purpose                                                                          |
| --------------------------- | -------------------------------------------------------------------------------- |
| TXT                         | Proves the tenant owns the domain                                                |
| MX                          | Points receiving mail at our servers                                             |
| SPF                         | Names our outbound hosts, in one record, under 10 DNS lookups                    |
| DKIM                        | 2048-bit RSA selector, with an optional Ed25519 signature                        |
| DMARC                       | Starts at `p=none` with testing enabled, then moves toward quarantine and reject |
| MTA-STS and TLS-RPT         | Tell senders to use TLS and where to send TLS reports                            |
| Autoconfig and autodiscover | Help mail clients find the servers                                               |

Failed checks use the `API-DNS-*` codes in [error codes](./error-codes.md). Registrar-specific click paths will be added with the wizard.
