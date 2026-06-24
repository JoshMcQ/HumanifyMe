// Playwright e2e for the Try-It widget. Route-mocked: no real backend, asserts
// the exact POST the widget sends. Run with:  npm run test:e2e
// (after a one-time `npx playwright install chromium`).
import { test, expect } from '@playwright/test';

test('rating a humanified example posts a try-it signal', async ({ page }) => {
  const posts: Array<Record<string, unknown>> = [];
  await page.route('**/api/feedback', async (route) => {
    posts.push(JSON.parse(route.request().postData() ?? '{}'));
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await page.goto('/try-it.html');

  // Reveal the rewrite.
  await page.click('#ti-humanify');
  await expect(page.locator('#ti-rewrite')).toBeVisible();

  // Send is disabled until a rating is chosen.
  await expect(page.locator('#ti-send')).toBeDisabled();

  await page.click('[data-signal="accept"]');
  await page.fill('#ti-comment', 'felt natural');
  await expect(page.locator('#ti-send')).toBeEnabled();
  await page.click('#ti-send');

  await expect(page.locator('#ti-thanks')).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ source: 'try-it', signal: 'accept' });
  expect(typeof posts[0]!.contextLabel).toBe('string');
});

test('a different rating sends the matching signal', async ({ page }) => {
  const posts: Array<Record<string, unknown>> = [];
  await page.route('**/api/feedback', async (route) => {
    posts.push(JSON.parse(route.request().postData() ?? '{}'));
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await page.goto('/try-it.html');
  await page.click('#ti-humanify');
  await page.click('[data-signal="reject"]');
  await page.click('#ti-send');
  expect(posts[0]).toMatchObject({ source: 'try-it', signal: 'reject' });
});
