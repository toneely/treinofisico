import { test, expect } from '@playwright/test';

test('landing page has content and login link', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Check Hero title
  await expect(page.locator('h1')).toContainText('Treinos Inteligentes');

  // Check Header logo text
  await expect(page.locator('header')).toContainText('Treino Físico');

  // Check CTA button
  const cta = page.getByRole('link', { name: 'Começar Agora Gratuitamente' });
  await expect(cta).toBeVisible();

  // Navigate to login
  await cta.click();
  await expect(page).toHaveURL(/\/login/);

  // Check login page content
  await expect(page.getByText('Entrar com Google')).toBeVisible();
});

test('privacy policy and terms of use links work', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Check Privacy Policy
  await page.getByRole('link', { name: 'Políticas de Privacidade' }).click();
  await expect(page).toHaveURL(/\/privacy/);
  await expect(page.locator('h1')).toContainText('Políticas de Privacidade');

  await page.goBack();

  // Check Terms of Use
  await page.getByRole('link', { name: 'Termos de Uso' }).click();
  await expect(page).toHaveURL(/\/terms/);
  await expect(page.locator('h1')).toContainText('Termos de Uso');
});
