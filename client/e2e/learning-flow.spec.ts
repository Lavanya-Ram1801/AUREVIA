import { expect, test } from '@playwright/test';

/**
 * Essential end-to-end flow. Requires: API running on :4000 with a migrated + seeded database (`npm run db:seed`),
 * and the demo password from SEED_PASSWORD exported as E2E_PASSWORD.
 *   E2E_PASSWORD='…' npm run e2e --prefix client
 */
const PASSWORD = process.env.E2E_PASSWORD;
test.skip(!PASSWORD, 'Set E2E_PASSWORD to the SEED_PASSWORD used when seeding.');

test('new learner can register, enroll, complete a lesson and see saved progress', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`;
  const pw = 'E2e-Passw0rd-1';

  await page.goto('/register');
  await page.getByLabel('Full name').fill('E2E Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(pw);
  await page.getByLabel('Confirm password').fill(pw);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("You haven't enrolled in a course yet")).toBeVisible();

  await page.goto('/courses');
  await page.getByLabel('Search').fill('JavaScript');
  const card = page.getByRole('link', { name: /Modern JavaScript/ }).first();
  await expect(card).toBeVisible();
  await card.click();
  await page.getByRole('button', { name: 'Enroll for free' }).click();
  await expect(page).toHaveURL(/\/learn\//, { timeout: 10_000 });

  await page.getByRole('button', { name: /mark (as )?complete/i }).first().click();
  await expect(page.getByText(/%/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /completed|mark (as )?incomplete/i }).first()).toBeVisible();

  await page.goto('/dashboard');
  await expect(page.getByText('Enrolled courses')).toBeVisible();
});

test('instructor can sign in and open the course manager; students cannot reach it', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('maya-iyer@demo.aurevia.test');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/instructor/);
  await page.goto('/instructor/courses');
  await expect(page.getByRole('heading', { name: 'My courses' })).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).first().click();
  await page.goto('/login');
  await page.getByLabel('Email').fill('alex-student@demo.aurevia.test');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard/);
});
