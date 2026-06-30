import { test, expect } from '@playwright/test';

test('verify login page renders and toggles modes', async ({ page }) => {
  // We point to the build artifact for visual check
  await page.goto('http://localhost:4173/login');

  await expect(page.locator('h1')).toContainText('Treino Físico');
  await expect(page.getByRole('button', { name: 'Entrar na Conta' })).toBeVisible();

  // Toggle to Sign Up
  await page.click('text=Não tem uma conta? Cadastre-se');
  await expect(page.locator('button', { hasText: /Criar Conta/i })).toBeVisible();

  await page.screenshot({ path: 'login_verification.png' });
});

test('verify training state machine structure', async ({ page }) => {
  // This is a structural check of the Training page layout
  // Actual training requires auth which we bypass in unit logic but here we just check elements
  await page.goto('http://localhost:4173/treino/A');
  // Should redirect to login if not authenticated
  await expect(page).toHaveURL(/.*login/);
});
