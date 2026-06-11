# Launch checklist

Ordered. Items marked **[J]** need Joshua personally; everything else is done
or can be done by an agent in a session.

## 1. Publish the npm package — [J], ~15 min

```powershell
cd $HOME\HumanifyMe
npm test                    # 88 passing
npm run build
npm login                   # needs your npmjs.com account
npm publish --access public
```

Then verify from any folder: `npx -y humanifyme --version`.
The name `humanifyme` must be unclaimed on npm — check first:
`npm view humanifyme` (an error = it's free). If taken, fallback names:
`humanifyme-mcp`, `@humanifyme/mcp` (scoped requires the org). Update
`humanifyme.plugin/mcp/server.json`, `docs/install/`, and the site snippets
if the name changes.

## 2. Deploy the site — [J] for DNS, ~30 min

The site is static: `site/` (index.html, privacy.html, terms.html).
Any static host works. Fastest path: Cloudflare Pages or GitHub Pages.

- Point humanifyme.com at the host.
- Add the white paper at /whitepaper (render docs/whitepaper.md to HTML, or
  link the GitHub blob until then).
- Create og.png (1200x630: tagline + before/after card) — referenced by the
  meta tags. A session with image tooling can generate this.
- Run Lighthouse (target ≥95 mobile + desktop; the page is dependency-free
  so this should pass as-is).

## 3. Publish the GitHub repo — [J], ~10 min

- Create the public repo (github.com/new), push main.
- Check: `my-writing/` is gitignored (it is) — your personal samples never
  leave your machine. Double-check with `git status` before pushing.
- Add the repo URL to package.json (`repository` field) and site footer.

## 4. Validate real installs — [J] + agent, ~30 min

- Cowork: Install from file → humanifyme.plugin/. Run the build-voice-profile
  skill end to end.
- Claude Code: `claude mcp add humanifyme -- npx -y --package humanifyme@latest humanifyme-mcp`,
  then "humanify this draft" in a session.
- Record the 30s screencast while doing this (shot list in
  marketing/listings/descriptions.md).

## 5. Marketplace submissions — [J] forms, copy is ready

- Cowork plugin marketplace + Claude Code marketplace.
- All copy: marketing/listings/descriptions.md. Screenshots from step 4.

## 6. Announce — [J], copy is ready

- Show HN first (drafts in marketing/launch/posts.md — read aloud, edit,
  ideally humanify them).
- Product Hunt 1-2 weeks later with HN feedback folded in.
- Reddit (r/ClaudeAI, r/LocalLLaMA) after PH.

## 7. Alpha cohort (launch-plan.md)

- Target 10-30 users from the HN/Reddit threads; survey per launch plan.
- Triage process: GitHub issues, label taxonomy in docs/risks.md.

## Known pre-launch polish (nice-to-have, not blocking)

- Suppress the node:sqlite ExperimentalWarning in CLI output
  (`--no-warnings` in the bin shebang or NODE_OPTIONS).
- `profile edit` UX on Windows (notepad blocks correctly; verified pattern).
- Joshua's profile: rebuild from Claude export when it arrives; add the
  "keeps leading I in status updates" preference if the export rebuild
  doesn't capture it naturally.
