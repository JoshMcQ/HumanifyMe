# Security Policy

HumanifyMe's entire premise is that a person's writing stays on their machine, so
security and privacy reports are taken seriously and handled fast.

## Reporting a vulnerability

**Do not open a public issue for security problems.** Instead, either:

- Use GitHub's private **"Report a vulnerability"** button under the repository's
  **Security** tab (Security Advisories), or
- Email **joshuamcqueary@gmail.com** with details and, if possible, a proof of
  concept.

Please include the affected version, reproduction steps, and the impact you see.
You can expect an acknowledgement within a few days.

## What is especially in scope

Because the privacy guarantees are the product, these areas matter most:

- **Data exfiltration:** any path that sends raw user samples, drafts, or rewrites
  anywhere other than the user's configured LLM provider.
- **Redaction bypass:** input that reaches a provider with emails, phone numbers,
  addresses, card numbers, API keys, or tokens unmasked. See `src/privacy/`.
- **Outbound allowlist bypass:** any `fetch()` to a host not on the allowlist
  enforced by `src/network/outbound-scan.test.ts`.
- **Local storage escape:** writing or reading user data outside `~/.humanifyme/`.
- **Supply chain:** issues in how the npm package or the plugin manifest resolves
  and executes code.

## Supported versions

The latest published `0.x` release on npm receives security fixes. Given the
pre-1.0 stage, please report against the most recent version.
