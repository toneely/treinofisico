# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/auth_flow.spec.js >> verify login page renders and toggles modes
- Location: tests/auth_flow.spec.js:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button').filter({ hasText: /Criar Conta/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button').filter({ hasText: /Criar Conta/i })

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
  3  | test('verify login page renders and toggles modes', async ({ page }) => {
  4  |   // We point to the build artifact for visual check
  5  |   await page.goto('http://localhost:4173/login');
  6  |
  7  |   await expect(page.locator('h1')).toContainText('Treino Físico');
  8  |   await expect(page.getByRole('button', { name: 'Entrar na Conta' })).toBeVisible();
  9  |
  10 |   // Toggle to Sign Up
  11 |   await page.click('text=Não tem uma conta? Cadastre-se');
> 12 |   await expect(page.locator('button', { hasText: /Criar Conta/i })).toBeVisible();
     |                                                                     ^ Error: expect(locator).toBeVisible() failed
  13 |
  14 |   await page.screenshot({ path: 'login_verification.png' });
  15 | });
  16 |
  17 | test('verify training state machine structure', async ({ page }) => {
  18 |   // This is a structural check of the Training page layout
  19 |   // Actual training requires auth which we bypass in unit logic but here we just check elements
  20 |   await page.goto('http://localhost:4173/treino/A');
  21 |   // Should redirect to login if not authenticated
  22 |   await expect(page).toHaveURL(/.*login/);
  23 | });
  24 |
```