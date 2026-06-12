# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux_enhancements.spec.js >> Verify Training V2 UX Enhancements
- Location: frontend/tests/ux_enhancements.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.focus: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="number"]').nth(1)

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - img "Logo" [ref=e8]
    - heading "Treino Físico" [level=1] [ref=e9]
    - paragraph [ref=e10]: Sua jornada para a excelência
  - button "Entrar com Google" [ref=e11] [cursor=pointer]:
    - img [ref=e12]
    - text: Entrar com Google
  - generic [ref=e21]: ou e-mail
  - generic [ref=e22]:
    - generic [ref=e23]:
      - text: Seu E-mail
      - generic [ref=e24]:
        - img [ref=e25]
        - textbox "nome@email.com" [ref=e28]
    - generic [ref=e29]:
      - text: Senha
      - generic [ref=e30]:
        - img [ref=e31]
        - textbox "••••••••" [ref=e34]
    - button "Entrar na Conta" [ref=e35] [cursor=pointer]
  - paragraph [ref=e36]:
    - text: Não tem uma conta?
    - generic [ref=e37] [cursor=pointer]: Cadastre-se
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
  14 |   // 1. Verify Input behavior (Carga/Reps)
  15 |   // Skip metronome inputs
  16 |   const cargaInput = page.locator('input[type="number"]').nth(1);
> 17 |   await cargaInput.focus();
     |                    ^ Error: locator.focus: Test timeout of 30000ms exceeded.
  18 |   // It should be selected, but let's test clearing it
  19 |   await cargaInput.fill('');
  20 |   await expect(cargaInput).toHaveValue('');
  21 |   await cargaInput.fill('50');
  22 |   await expect(cargaInput).toHaveValue('50');
  23 |
  24 |   // 2. Verify Session List Details Grid
  25 |   const sessionList = page.locator('text=Exercícios da Sessão');
  26 |   await expect(sessionList).toBeVisible();
  27 |
  28 |   // Check if first exercise in list has a grid
  29 |   const gridItem = page.locator('.grid-cols-5').first();
  30 |   await expect(gridItem).toBeVisible();
  31 |
  32 |   // 3. Verify Real-time Sync in Grid (Exec Timer)
  33 |   const startBtn = page.getByTestId('start-timer-btn');
  34 |   await startBtn.click();
  35 |
  36 |   // Look for the active series in the grid (it should have a timer running)
  37 |   // The first series cell should now show something other than --:--
  38 |   const firstSeriesCell = gridItem.locator('span.font-mono.font-bold').first();
  39 |
  40 |   // Wait a couple of seconds for timer to tick
  41 |   await page.waitForTimeout(2100);
  42 |   const timeText = await firstSeriesCell.innerText();
  43 |   console.log('Timer text in grid:', timeText);
  44 |   expect(timeText).not.toBe('--:--');
  45 |   expect(timeText).not.toBe('0:00');
  46 |
  47 |   // 4. Verify Real-time Sync in Grid (Rest Timer)
  48 |   const stopBtn = page.getByTestId('stop-timer-btn');
  49 |   await stopBtn.click();
  50 |
  51 |   // Now the rest timer in that cell should start animating
  52 |   const restTimerInCell = gridItem.locator('span.animate-pulse').first();
  53 |   await expect(restTimerInCell).toBeVisible();
  54 |   await page.waitForTimeout(2100);
  55 |   const restText = await restTimerInCell.innerText();
  56 |   console.log('Rest text in grid:', restText);
  57 |   expect(restText).not.toBe('--:--');
  58 | });
  59 |
```