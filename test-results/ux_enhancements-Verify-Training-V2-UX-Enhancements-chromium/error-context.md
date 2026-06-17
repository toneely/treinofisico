# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux_enhancements.spec.js >> Verify Training V2 UX Enhancements
- Location: frontend/tests/ux_enhancements.spec.js:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('label:has-text("Carga (kg)") + input')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('label:has-text("Carga (kg)") + input')

```

```yaml
- img "Logo"
- heading "Treino Físico" [level=1]
- paragraph: Sua jornada para a excelência
- button "Entrar com Google":
  - img
  - text: Entrar com Google
- text: ou e-mail Seu E-mail
- img
- textbox "nome@email.com"
- text: Senha
- img
- textbox "••••••••"
- button "Entrar na Conta"
- paragraph: Não tem uma conta? Cadastre-se
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('Verify Training V2 UX Enhancements', async ({ page }) => {
  4  |   // Go to a training session
  5  |   await page.goto('http://localhost:5173/treino/A');
  6  |
  7  |   // Debug: Take screenshot if it fails
  8  |   await page.screenshot({ path: 'debug_training.png' });
  9  |
  10 |   await page.waitForSelector('text=Bloco 1 de', { timeout: 10000 }).catch(e => {
  11 |      console.log('Selector "Bloco 1 de" not found');
  12 |   });
  13 |
  14 |   // 1. Verify Input behavior (Carga/Reps) - Now inside the active card
  15 |   const cargaInput = page.locator('label:has-text("Carga (kg)") + input');
> 16 |   await expect(cargaInput).toBeVisible();
     |                            ^ Error: expect(locator).toBeVisible() failed
  17 |   await cargaInput.focus();
  18 |   // It should be selected, but let's test clearing it
  19 |   await cargaInput.fill('');
  20 |   await expect(cargaInput).toHaveValue('');
  21 |   await cargaInput.fill('50');
  22 |   await expect(cargaInput).toHaveValue('50');
  23 |
  24 |   // 2. Verify Session List Details Grid - grid-cols-4 in new version
  25 |   const sessionList = page.locator('text=Exercícios da Sessão');
  26 |   await expect(sessionList).toBeVisible();
  27 |
  28 |   // Check if first exercise in list has a grid (using horizontal scroll container in V2)
  29 |   const gridItem = page.locator('.overflow-x-auto').first();
  30 |   await expect(gridItem).toBeVisible();
  31 |
  32 |   // 3. Verify Real-time Sync in Grid (Exec Timer)
  33 |   const startBtn = page.locator('button:has(svg.lucide-play)');
  34 |   await startBtn.click();
  35 |
  36 |   // Look for the active series in the grid (it should have a timer running)
  37 |   const firstSeriesCell = gridItem.locator('span.font-mono.font-bold').first();
  38 |
  39 |   // Wait a couple of seconds for timer to tick
  40 |   await page.waitForTimeout(2100);
  41 |   const timeText = await firstSeriesCell.innerText();
  42 |   console.log('Timer text in grid:', timeText);
  43 |   expect(timeText).not.toBe('0:00');
  44 |
  45 |   // 4. Verify Real-time Sync in Grid (Rest Timer)
  46 |   const stopBtn = page.locator('button:has(svg.lucide-square)');
  47 |   await stopBtn.click();
  48 |
  49 |   // Now the rest timer in that cell should start animating
  50 |   const restTimerInCell = gridItem.locator('.animate-pulse').first();
  51 |   await expect(restTimerInCell).toBeVisible();
  52 |   await page.waitForTimeout(2100);
  53 |   const restText = await restTimerInCell.innerText();
  54 |   console.log('Rest text in grid:', restText);
  55 |   expect(restText).not.toBe('--:--');
  56 | });
  57 |
```