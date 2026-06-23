# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/ux_enhancements.spec.js >> Verify Training V2 UX Enhancements
- Location: tests/ux_enhancements.spec.js:3:1

# Error details

```
TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('text=Manual') to be visible

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
  14 |   await page.goto('http://localhost:5173/treino/LIVRE');
  15 |
  16 |   // Wait for loading to finish
  17 |   await page.waitForSelector('text=Carregando...', { state: 'detached', timeout: 20000 });
  18 |
  19 |   // Look for any identifying text in Training.jsx header
> 20 |   await page.waitForSelector('text=Manual', { timeout: 20000 });
     |              ^ TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
  21 |
  22 |   // 1. Switch to Manual Mode
  23 |   await page.get_by_role("button", { name: "Manual" }).click();
  24 |
  25 |   // 2. Add an exercise
  26 |   await page.locator('button:has-text("Adicionar Exercício")').first().click();
  27 |   await page.waitForSelector('text=Musculação', { timeout: 10000 });
  28 |   await page.locator('div[role="button"]').first().click();
  29 |
  30 |   // 3. Verify Series Grid is visible
  31 |   const series1 = page.get_by_text("1", { exact: true }).first();
  32 |   await expect(series1).toBeVisible();
  33 |
  34 |   // 4. Set Focus to Series 2
  35 |   const series2 = page.get_by_text("2", { exact: true }).first();
  36 |   await series2.click();
  37 |   const series2Container = series2.locator('..');
  38 |   await expect(series2Container).toHaveClass(/scale-\[1.08\]/);
  39 |
  40 |   // 5. Switch to a new exercise
  41 |   await page.locator('button:has-text("Adicionar Exercício")').first().click();
  42 |   await page.locator('div[role="button"]').nth(1).click();
  43 |
  44 |   // Switch back to first exercise and verify focus persistence
  45 |   await page.locator('p.font-bold').first().click();
  46 |   await expect(series2Container).toHaveClass(/scale-\[1.08\]/);
  47 | });
  48 |
```