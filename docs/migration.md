# Migration

Last updated: 2026-11-26 · v0.1.0

Import from another mailbox is not built yet. The planned sources are Gmail and Google Workspace, Microsoft 365, Zoho, and generic IMAP.

A failed sign-in to the old mailbox returns `API-MIG-001`. If the old server stops answering, the import pauses with `API-MIG-002` and resumes later. Credentials used for the import are deleted when the import ends.
