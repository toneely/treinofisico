# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/ux_enhancements.spec.js >> Verify Training V2 UX Enhancements
- Location: tests/ux_enhancements.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Manual")')

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
  4  |   await page.addInitScript(() => {
  5  |     window.localStorage.setItem('sb-fbdzbafzdmzcrteqhbto-auth-token', JSON.stringify({
  6  |       access_token: 'mock-token',
  7  |       token_type: 'bearer',
  8  |       expires_in: 3600,
  9  |       refresh_token: 'mock-refresh-token',
  10 |       user: { id: 'mock-user-id', email: 'test@example.com' }
  11 |     }));
  12 |   });
  13 |
  14 |   await page.goto('http://localhost:4173/treino/LIVRE');
  15 |
  16 |   // Wait for loading to finish
  17 |   await page.waitForSelector('text=Carregando...', { state: 'detached', timeout: 20000 });
  18 |
  19 |   // 1. Switch to Manual Mode
  20 |   // Use a more robust selector for the Manual button
> 21 |   await page.click('button:has-text("Manual")');
     |              ^ Error: page.click: Test timeout of 30000ms exceeded.
  22 |
  23 |   // 2. Add an exercise
  24 |   await page.locator('button:has-text("Adicionar Exercício")').first().click();
  25 |   await page.waitForSelector('text=Musculação', { timeout: 10000 });
  26 |   await page.locator('div[role="button"]').first().click();
  27 |
  28 |   // 3. Verify Series Grid is visible
  29 |   const series1 = page.get_by_text("1", { exact: true }).first();
  30 |   await expect(series1).toBeVisible();
  31 |
  32 |   // 4. Set Focus to Series 2
  33 |   const series2 = page.get_by_text("2", { exact: true }).first();
  34 |   await series2.click();
  35 |   const series2Container = series2.locator('..');
  36 |   // Check if it has the active styling (scale or border)
  37 |   await expect(series2Container).toBeVisible();
  38 |
  39 |   // 5. Switch to a new exercise
  40 |   await page.locator('button:has-text("Adicionar Exercício")').first().click();
  41 |   // Wait for list to appear
  42 |   await page.waitForTimeout(500);
  43 |   await page.locator('div[role="button"]').nth(1).click();
  44 |
  45 |   // Switch back to first exercise and verify focus persistence
  46 |   await page.locator('p.font-bold').first().click();
  47 |   await expect(series2Container).toBeVisible();
  48 | });
  49 |
```