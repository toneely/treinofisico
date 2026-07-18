import { test, expect } from '@playwright/test';

test.describe('Navegação BottomNav e Page Transitions', () => {
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
  });

  test('Historico -> Home via BottomNav', async ({ page }) => {
    const bottomNav = page.locator('nav');

    // Ir para Historico usando a navegação do BottomNav
    await bottomNav.getByRole('link', { name: 'Histórico' }).click();
    await page.waitForURL('**/historico');
    await page.waitForTimeout(1000); // aguarda animação terminar

    // Voltar para Home (Treinos) usando o link do BottomNav
    await bottomNav.getByRole('link', { name: 'Treinos' }).click();
    await page.waitForURL('**/app');
    await page.waitForTimeout(1000); // aguarda animação terminar

    // Verificar se o conteúdo da Home está visível
    const heading = page.locator('header h1').first();
    await expect(heading).toContainText('Olá');
    await expect(heading).toBeVisible();

    // Garantir que a página anterior foi perfeitamente unmontada do DOM
    const wrappersCount = await page.evaluate(() => {
      return document.querySelectorAll('div.w-full.min-h-screen.top-0.left-0').length;
    });
    expect(wrappersCount).toBe(1);

    await page.screenshot({ path: 'historico_to_home.png' });
  });

  test('Perfil -> Home via BottomNav', async ({ page }) => {
    const bottomNav = page.locator('nav');

    // Ir para Perfil usando a navegação do BottomNav
    await bottomNav.getByRole('link', { name: 'Perfil' }).click();
    await page.waitForURL('**/perfil');
    await page.waitForTimeout(1000); // aguarda animação terminar

    // Voltar para Home (Treinos) usando o link do BottomNav
    await bottomNav.getByRole('link', { name: 'Treinos' }).click();
    await page.waitForURL('**/app');
    await page.waitForTimeout(1000); // aguarda animação terminar

    // Verificar se o conteúdo da Home está visível
    const heading = page.locator('header h1').first();
    await expect(heading).toContainText('Olá');
    await expect(heading).toBeVisible();

    // Garantir que a página anterior foi perfeitamente unmontada do DOM
    const wrappersCount = await page.evaluate(() => {
      return document.querySelectorAll('div.w-full.min-h-screen.top-0.left-0').length;
    });
    expect(wrappersCount).toBe(1);

    await page.screenshot({ path: 'perfil_to_home.png' });
  });
});
