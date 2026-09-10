# Security

Apply this reference automatically when the change touches authentication, authorization, secrets, PII/private data, payments, uploads, external/untrusted input, exposed APIs, production infrastructure, networking, destructive actions, or security boundaries.

Minimum rules:

- Identify trust boundaries and who is allowed to perform each sensitive action.
- Validate and constrain untrusted input at the boundary where it enters the system.
- Enforce authorization server-side or at the authoritative control point; UI hiding is not authorization.
- Keep secrets, credentials, tokens, private logs, and production data out of source control and unapproved model/tool transmissions.
- Use least privilege for service accounts, tokens, database policies, and infrastructure permissions.
- Preserve existing security controls unless an approved requirement explicitly changes them.
- For uploads or externally supplied files/content, define type/size/processing constraints and avoid unsafe execution paths.
- For public APIs, consider authentication, authorization, rate/abuse controls, validation, error disclosure, and CORS/origin policy as applicable.
- For migrations/destructive operations, define rollback/recovery and require explicit authorization before applying irreversible production actions.
- Do not invent compliance claims. If compliance is required, state what was actually implemented/verified and what remains outside scope.

Security acceptance criteria belong in `requirements.md`; design choices belong in `design.md`; verification evidence belongs in `verification.md`. Do not create a parallel security workflow or a large compliance report unless the user explicitly needs one.
