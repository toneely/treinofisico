import { test, expect } from '@playwright/test';

test('Verify public landing page renders immediately and completely without active session', async ({ page }) => {
  // Go to the landing page which is served at "/"
  await page.goto('http://localhost:4173/');

  // Confirm that LandingPage heading "Transforme seu corpo" is present and visible
  const heading = page.locator('h1', { hasText: 'Transforme seu corpo com' });
  await expect(heading).toBeVisible({ timeout: 5000 });

  // Verify the "Entrar / Cadastrar" link or button is visible
  const enterLink = page.locator('text=Entrar / Cadastrar');
  await expect(enterLink).toBeVisible();

  // Ensure there is no active loading screen or "Carregando..." text currently blockading the public view
  const loadingText = page.locator('text=Carregando...');
  await expect(loadingText).not.toBeVisible();
});

test('Verify login page renders immediately under PublicOnlyRoute', async ({ page }) => {
  // Go to the login page which is served at "/login"
  await page.goto('http://localhost:4173/login');

  // Verify elements of the Login page are visible instantly
  const mainTitle = page.locator('h1', { hasText: 'Treino Físico' });
  await expect(mainTitle).toBeVisible({ timeout: 5000 });

  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible();

  // Ensure there is no active "Carregando..." text
  const loadingText = page.locator('text=Carregando...');
  await expect(loadingText).not.toBeVisible();
});
