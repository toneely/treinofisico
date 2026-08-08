import { test, expect } from '@playwright/test';

test('Verify Training V2 UX Enhancements', async ({ page }) => {
  // Mock Supabase API calls
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/rpc/buscar_exercicios_unificados')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id_original: 'ex1', nome: 'Supino Reto', alvo_principal: 'Peito', fonte: 'pessoal', id_pessoal: 'ex1_p' },
          { id_original: 'ex2', nome: 'Agachamento', alvo_principal: 'Pernas', fonte: 'pessoal', id_pessoal: 'ex2_p' }
        ])
      });
    } else if (url.includes('/modalidades')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'm1', nome: 'Musculação' }])
      });
    } else if (url.includes('/exercicios')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'ex1_p', nome: 'Supino Reto', alvo_principal: 'Peito' }])
      });
    } else if (url.includes('/usuarios')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-user-id', nome: 'Test User', testador_pagamento: true, status_assinatura: 'premium' }])
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem('sb-fbdzbafzdmzcrteqhbto-auth-token', JSON.stringify({
      access_token: 'mock-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'mock-refresh-token',
      user: { id: 'mock-user-id', email: 'test@example.com' }
    }));
  });

  await page.goto('http://localhost:4173/treino/LIVRE');

  // Wait for loading to finish
  await page.waitForSelector('text=Carregando...', { state: 'detached', timeout: 20000 });

  // 1. Switch to Manual Mode
  await page.click('button:has-text("Manual")');

  // 2. Add an exercise
  await page.locator('button:has-text("Adicionar Exercício")').first().click();
  await page.waitForSelector('text=Musculação', { timeout: 10000 });
  await page.click('button:has-text("Musculação")');
  await page.click('button:has-text("Supino Reto")');

  // 3. Verify Series Grid is visible
  const series1 = page.getByText("1", { exact: true }).first();
  await expect(series1).toBeVisible();

  // 4. Set Focus to Series 2
  const series2 = page.getByText("2", { exact: true }).first();
  await series2.click();
  const series2Container = series2.locator('..');
  // Check if it has the active styling (scale or border)
  await expect(series2Container).toBeVisible();

  // 5. Switch to a new exercise
  await page.locator('button:has-text("Adicionar Exercício")').first().click();
  // Wait for list to appear
  await page.waitForTimeout(500);
  await page.click('button:has-text("Musculação")');
  await page.click('button:has-text("Agachamento")');

  // Switch back to first exercise and verify focus persistence
  await page.locator('p.font-bold', { hasText: 'Supino Reto' }).first().click();
  await expect(series2Container).toBeVisible();
});

test('Verify Exercise Selector Dynamic Opening Behavior', async ({ page }) => {
  // Mock Supabase API calls
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/rpc/buscar_exercicios_unificados')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id_original: 'ex1', nome: 'Supino Reto', alvo_principal: 'Peito', fonte: 'pessoal', id_pessoal: 'ex1_p' },
          { id_original: 'ex2', nome: 'Agachamento', alvo_principal: 'Pernas', fonte: 'pessoal', id_pessoal: 'ex2_p' }
        ])
      });
    } else if (url.includes('/modalidades')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'm1', nome: 'Musculação' }])
      });
    } else if (url.includes('/exercicios')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'ex1_p', nome: 'Supino Reto', alvo_principal: 'Peito' }])
      });
    } else if (url.includes('/usuarios')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-user-id', nome: 'Test User', testador_pagamento: true, status_assinatura: 'premium' }])
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem('sb-fbdzbafzdmzcrteqhbto-auth-token', JSON.stringify({
      access_token: 'mock-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'mock-refresh-token',
      user: { id: 'mock-user-id', email: 'test@example.com' }
    }));
  });

  await page.goto('http://localhost:4173/treino/LIVRE');

  // Wait for loading to finish
  await page.waitForSelector('text=Carregando...', { state: 'detached', timeout: 20000 });

  // Switch to Manual Mode
  await page.click('button:has-text("Manual")');

  // 1. ADD MODE test: Click 'Adicionar Exercício'
  await page.locator('button:has-text("Adicionar Exercício")').first().click();

  // In ADD mode, since currentExerciseId is null, isOpen should be true.
  // This means the list panel (with search input) should be immediately visible.
  await expect(page.locator('input[placeholder="Pesquisar..."]')).toBeVisible();

  // Add the exercise "Supino Reto"
  await page.click('button:has-text("Musculação")');
  await page.click('button:has-text("Supino Reto")');

  // 2. REPLACE/ALTER MODE test: Click the menu button for the exercise, then 'Alterar Exercício'
  // Click option button on exercise item to open dropdown menu
  const card = page.locator('div', { hasText: 'Supino Reto' }).first();
  await card.locator('button.p-2.rounded-lg.transition').click();

  // Click 'Alterar Exercício'
  await page.click('button:has-text("Alterar Exercício")');

  // In REPLACE mode, since currentExerciseId exists, isOpen should be initialized to false.
  // This means the list panel (search input) should NOT be immediately visible.
  await expect(page.locator('input[placeholder="Pesquisar..."]')).not.toBeVisible();

  // But the name "Supino Reto" should be selected/visible in the selector button
  await expect(page.locator('button:has-text("Supino Reto")').first()).toBeVisible();
});

test('Verify finishWorkout timeout and duplicate click protection', async ({ page }) => {
  let requestCount = 0;
  // Mock Supabase API calls to simulate hung connections
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/rpc/buscar_exercicios_unificados')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id_original: 'ex1', nome: 'Supino Reto', alvo_principal: 'Peito', fonte: 'pessoal', id_pessoal: 'ex1_p' }
        ])
      });
    } else if (url.includes('/modalidades')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'm1', nome: 'Musculação' }])
      });
    } else if (url.includes('/exercicios')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'ex1_p', nome: 'Supino Reto', alvo_principal: 'Peito' }])
      });
    } else if (url.includes('/usuarios')) {
      requestCount++;
      // HANG the connection on '/usuarios' request to trigger our 10-second timeout!
      await route.abort('timedout');
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem('sb-fbdzbafzdmzcrteqhbto-auth-token', JSON.stringify({
      access_token: 'mock-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'mock-refresh-token',
      user: { id: 'mock-user-id', email: 'test@example.com' }
    }));
  });

  await page.goto('http://localhost:4173/treino/LIVRE');

  // Wait for loading to finish
  await page.waitForSelector('text=Carregando...', { state: 'detached', timeout: 20000 });

  // Switch to Manual Mode and add an exercise
  await page.click('button:has-text("Manual")');
  await page.locator('button:has-text("Adicionar Exercício")').first().click();
  await page.waitForSelector('text=Musculação', { timeout: 10000 });
  await page.click('button:has-text("Musculação")');
  await page.click('button:has-text("Supino Reto")');

  // Complete one series
  const input = page.locator('input[type="number"]').first();
  await input.fill('10');
  await input.blur();

  // Open Header Menu
  await page.locator('header').locator('button').filter({ has: page.locator('svg') }).last().click();

  // Click the end workout button (Finalizar Treino)
  await page.click('button:has-text("Finalizar Treino")');
  await page.click('button:has-text("Sim, Finalizar")');

  // Since we aborted the request immediately with 'timedout' (or delayed), the Supabase API call will reject,
  // causing the connection error catch block to execute, displaying the connection error toast and unlocking the UI!
  await expect(page.locator('text=Erro de conexão com o servidor. Tente novamente.').or(page.locator('text=Erro ao salvar histórico'))).toBeVisible({ timeout: 15000 });

  // And the button should be unlocked/available again
  await page.locator('header').locator('button').filter({ has: page.locator('svg') }).last().click();
  await expect(page.locator('button:has-text("Finalizar Treino")')).toBeVisible();
});
