import { test, expect } from '@playwright/test';

test('verify login page renders and toggles modes', async ({ page }) => {
  // We point to the build artifact for visual check
  await page.goto('http://localhost:4173/login');

  await expect(page.locator('h1')).toContainText('Treino Físico');
  await expect(page.getByRole('button', { name: 'Entrar na Conta' })).toBeVisible();

  // Toggle to Sign Up
  await page.click('text=Cadastre-se');
  await expect(page.getByRole('button', { name: 'Criar Conta' })).toBeVisible();

  await page.screenshot({ path: 'login_verification.png' });
});

test.describe('Protected Routes E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Navegar para /login
    await page.goto('http://localhost:4173/login');

    // 2. Preencher o campo de email e senha
    await page.fill('input[type="email"]', 'toneely.gestor@gmail.com');
    await page.fill('input[type="password"]', '123treino45fisico');

    // 3. Acionar clique no botão principal de submissão do formulário
    await page.click('button:has-text("Entrar na Conta")');

    // 4. Aguardar redirecionamento para /app ou visibilidade do BottomNav
    await page.waitForURL('**/app', { timeout: 15000 });
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
  });

  test('Verify Inicio Page (Protected)', async ({ page }) => {
    await page.goto('http://localhost:4173/app');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Olá');
    await page.screenshot({ path: 'inicio_verification.png' });
  });

  test('Verify Treino Page (Protected)', async ({ page }) => {
    await page.goto('http://localhost:4173/treino/MA');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'treino_verification.png' });
  });

  test('Verify Gerenciar Treinos Page (Protected)', async ({ page }) => {
    await page.goto('http://localhost:4173/gerenciar-treinos');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'gerenciador_verification.png' });
  });

  test('Verify Historico Page (Protected)', async ({ page }) => {
    await page.goto('http://localhost:4173/historico');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'historico_verification.png' });
  });
});
