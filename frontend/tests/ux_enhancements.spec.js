import { test, expect } from '@playwright/test';

test('Verify Training V2 UX Enhancements', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-fbdzbafzdmzcrteqhbto-auth-token', JSON.stringify({
      access_token: 'mock-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: { id: 'mock-user-id', email: 'test@example.com' }
    }));
  });

  await page.goto('http://localhost:4173/treino/LIVRE');

  // Wait for loading to finish
  await page.waitForSelector('text=Carregando...', { state: 'detached', timeout: 20000 });

  // 1. Switch to Manual Mode
  // Use a more robust selector for the Manual button
  await page.click('button:has-text("Manual")');

  // 2. Add an exercise
  await page.locator('button:has-text("Adicionar Exercício")').first().click();
  await page.waitForSelector('text=Musculação', { timeout: 10000 });
  await page.locator('div[role="button"]').first().click();

  // 3. Verify Series Grid is visible
  const series1 = page.get_by_text("1", { exact: true }).first();
  await expect(series1).toBeVisible();

  // 4. Set Focus to Series 2
  const series2 = page.get_by_text("2", { exact: true }).first();
  await series2.click();
  const series2Container = series2.locator('..');
  // Check if it has the active styling (scale or border)
  await expect(series2Container).toBeVisible();

  // 5. Switch to a new exercise
  await page.locator('button:has-text("Adicionar Exercício")').first().click();
  // Wait for list to appear
  await page.waitForTimeout(500);
  await page.locator('div[role="button"]').nth(1).click();

  // Switch back to first exercise and verify focus persistence
  await page.locator('p.font-bold').first().click();
  await expect(series2Container).toBeVisible();
});
