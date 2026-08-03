# Releasing HumanifyMe

Releases are published from `.github/workflows/release.yml`. Do not publish from a
maintainer laptop. The workflow binds the npm package to a reviewed Git commit,
runs the package's full prepublish checks, and emits provenance.

## One-time npm configuration

Configure `humanifyme` on npmjs.com with this trusted publisher:

| Setting | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization or user | `JoshMcQ` |
| Repository | `HumanifyMe` |
| Workflow filename | `release.yml` |
| Environment | none |
| Allowed action | `npm publish` |

The workflow uses GitHub OIDC and does not require `NPM_TOKEN`. After trusted
publishing succeeds once, set npm publishing access to require two-factor
authentication and disallow token-based publishing. npm documents the setup and
minimum CLI requirements in its
[trusted publishing guide](https://docs.npmjs.com/trusted-publishers/).

### Fallback: publish with an npm access token

If trusted publishing is not yet configured on npm, the workflow can fall back to
a classic access token. Create an npm access token with **Publish** permission
for the `humanifyme` package, then add it to this repository as a secret named
`NPM_TOKEN` at `Settings > Secrets and variables > Actions`. When `NPM_TOKEN` is
present, the workflow uses token auth; when it is absent, it uses OIDC
provenance as usual. Remove the secret once trusted publishing is working so
future releases resume provenance.

## Release checklist

1. Merge the release PR into `main` only after required CI and review checks pass.
2. Confirm the version is synchronized across `package.json`, plugin manifests,
   marketplace metadata, install documentation, and `CHANGELOG.md`:

   ```bash
   npm run check:release-version -- --tag v0.2.0 --ensure-unpublished
   ```

3. Reproduce the artifact locally from a clean install:

   ```bash
   npm ci
   npm run prepublishOnly
   ```

4. Create the version tag on the exact reviewed commit from `main`, then push only
   that tag:

   ```bash
   git switch main
   git pull --ff-only
   git tag v0.2.0
   git push origin v0.2.0
   ```

5. Watch the `Release` workflow. It rejects tags that are not reachable from
   `main`, version mismatches, and versions that already exist on npm. It creates
   the GitHub release only after npm publication succeeds.
6. Verify the public artifact rather than relying on the workflow result alone:

   ```bash
   npm view humanifyme@0.2.0 version dist.integrity dist.tarball
   npx -y humanifyme@0.2.0 --version
   echo "At its core, this robust approach paves the way." | npx -y humanifyme@0.2.0 analyze
   ```

7. Install the released plugin in a clean Claude Code profile and complete one
   setup, rewrite, and feedback cycle before announcing the release.

## Failed releases

Never move or overwrite a published tag. npm versions are immutable release
records. If a published artifact is defective, deprecate that exact version with a
specific warning, fix the issue on a new branch, and release the next patch version.
Do not unpublish a version unless it exposes secrets or creates an equivalent
security emergency.
