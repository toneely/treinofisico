import { test, expect } from '@playwright/test';

test('Verify Training V2 UX Enhancements', async ({ page }) => {
  // Go to a training session
  await page.goto('http://localhost:5173/treino/A');

  // Debug: Take screenshot if it fails
  await page.screenshot({ path: 'debug_training.png' });

  await page.waitForSelector('text=Bloco 1 de', { timeout: 10000 }).catch(e => {
     console.log('Selector "Bloco 1 de" not found');
  });

  // 1. Verify Input behavior (Carga/Reps) - Now inside the active card
  const cargaInput = page.locator('label:has-text("Carga (kg)") + input');
  await expect(cargaInput).toBeVisible();
  await cargaInput.focus();
  // It should be selected, but let's test clearing it
  await cargaInput.fill('');
  await expect(cargaInput).toHaveValue('');
  await cargaInput.fill('50');
  await expect(cargaInput).toHaveValue('50');

  // 2. Verify Session List Details Grid - grid-cols-4 in new version
  const sessionList = page.locator('text=Exercícios da Sessão');
  await expect(sessionList).toBeVisible();

  // Check if first exercise in list has a grid
  const gridItem = page.locator('.grid-cols-4').first();
  await expect(gridItem).toBeVisible();

  // 3. Verify Real-time Sync in Grid (Exec Timer)
  const startBtn = page.locator('button:has(svg.lucide-play)');
  await startBtn.click();

  // Look for the active series in the grid (it should have a timer running)
  const firstSeriesCell = gridItem.locator('span.font-mono.font-bold').first();

  // Wait a couple of seconds for timer to tick
  await page.waitForTimeout(2100);
  const timeText = await firstSeriesCell.innerText();
  console.log('Timer text in grid:', timeText);
  expect(timeText).not.toBe('0:00');

  // 4. Verify Real-time Sync in Grid (Rest Timer)
  const stopBtn = page.locator('button:has(svg.lucide-square)');
  await stopBtn.click();

  // Now the rest timer in that cell should start animating
  const restTimerInCell = gridItem.locator('.animate-pulse').first();
  await expect(restTimerInCell).toBeVisible();
  await page.waitForTimeout(2100);
  const restText = await restTimerInCell.innerText();
  console.log('Rest text in grid:', restText);
  expect(restText).not.toBe('--:--');
});
