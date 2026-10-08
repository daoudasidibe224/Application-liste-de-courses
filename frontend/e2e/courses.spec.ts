import { test, expect } from '@playwright/test';
test('parcours réel : compte, listes, produits, filtres et déconnexion', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inscription');
  await page.getByLabel('Prénom', { exact: true }).fill('Camille');
  await page.getByLabel('Nom', { exact: true }).fill('Test');
  await page
    .getByLabel('Adresse email')
    .fill(`camille-${Date.now()}@example.fr`);
  await page.getByLabel('Mot de passe').fill('Passphrase-123');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(
    page.getByRole('heading', { name: 'Tout commence par une liste.' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Créer une liste', exact: true })
    .click();
  await page.getByLabel('Nom de la liste').fill('Courses samedi');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    page.getByRole('heading', { name: 'Courses samedi' }),
  ).toBeVisible();
  await page.getByLabel('Nouveau produit').fill('Tomates');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await expect(page.getByRole('checkbox', { name: 'Tomates' })).toBeVisible();
  await page.getByLabel('Nouveau produit').fill('Pain');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await page.getByRole('checkbox', { name: 'Tomates' }).check();
  await expect(page.getByRole('checkbox', { name: 'Tomates' })).toBeChecked();
  await page.getByRole('button', { name: 'À acheter', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Tomates' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Modifier Pain', exact: true }).click();
  await expect(page.getByLabel('Nom du produit')).toHaveValue('Pain');
  await page.getByLabel('Nom du produit').fill('Pain complet');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByLabel('Rechercher un produit').fill('complet');
  await expect(
    page.getByRole('checkbox', { name: 'Pain complet' }),
  ).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Tomates' })).toHaveCount(0);
  await page.getByLabel('Rechercher un produit').fill('');
  await page.getByRole('link', { name: 'Renommer', exact: true }).click();
  await expect(page.getByLabel('Nom de la liste')).toHaveValue(
    'Courses samedi',
  );
  await page.getByLabel('Nom de la liste').fill('Panier du samedi');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  for (const width of [320, 390, 800, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      JSON.stringify(
        await page.evaluate(() =>
          [...document.querySelectorAll('body *')]
            .filter((element) => {
              const box = element.getBoundingClientRect();
              return box.right > innerWidth + 1 || box.left < -1;
            })
            .map((element) => ({
              tag: element.tagName,
              className: element.className,
              text: element.textContent?.trim().slice(0, 60),
              box: element.getBoundingClientRect().toJSON(),
            })),
        ),
      ),
    ).toBeTruthy();
  }
  await page.screenshot({
    path: process.env.QA_SCREENSHOT || 'e2e-courses.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.QA_MOBILE_SCREENSHOT)
    await page.screenshot({
      path: process.env.QA_MOBILE_SCREENSHOT,
      fullPage: true,
    });
  await page.evaluate(() =>
    localStorage.setItem('x-access-token', 'expired-token'),
  );
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Panier du samedi' }),
  ).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Supprimer Pain complet', exact: true })
    .click();
  await expect(
    page.getByRole('checkbox', { name: 'Pain complet' }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Supprimer la liste', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Tout commence par une liste.' }),
  ).toBeVisible();
  await page.evaluate(() => localStorage.setItem('unrelated-app', 'keep'));
  await page.getByRole('button', { name: 'Déconnexion' }).click();
  await expect(page).toHaveURL(/login/);
  expect(await page.evaluate(() => localStorage.getItem('unrelated-app'))).toBe(
    'keep',
  );
  expect(errors).toEqual([]);
});

test('erreur de connexion visible et accès aux listes protégé', async ({
  page,
}) => {
  await page.goto('/listes');
  await expect(page).toHaveURL(/login/);
  await page.route('**/api/utilisateurs/login', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Email ou mot de passe invalide.' }),
    }),
  );
  await page.getByLabel('Adresse email').fill('wrong@example.fr');
  await page.getByLabel('Mot de passe').fill('Passphrase-123');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Email ou mot de passe invalide.',
  );
  await expect(
    page.getByRole('button', { name: 'Se connecter', exact: true }),
  ).toBeEnabled();
});

test('clavier et persistance à 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/inscription');
  await page.getByLabel('Prénom', { exact: true }).focus();
  await page.keyboard.type('Clavier');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Test');
  await page.keyboard.press('Tab');
  await page.keyboard.type(`keyboard-${Date.now()}@example.fr`);
  await page.keyboard.press('Tab');
  await page.keyboard.type('Passphrase-123');
  await expect(
    page.getByRole('button', { name: 'Créer mon compte' }),
  ).toBeEnabled();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Tout commence par une liste.' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Créer une liste', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Nom de la liste').focus();
  await page.keyboard.type('Clavier samedi');
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Clavier samedi' }),
  ).toBeVisible();
  await page.getByLabel('Nouveau produit').focus();
  await page.keyboard.type('Poires');
  await expect(page.getByRole('button', { name: '+ Ajouter' })).toBeEnabled();
  await page.keyboard.press('Enter');
  const checkbox = page.getByRole('checkbox', { name: 'Poires' });
  await expect(checkbox).toBeVisible();
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await page.reload();
  await expect(checkbox).toBeChecked();
  await page.getByRole('link', { name: 'Modifier Poires' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Nom du produit')).toHaveValue('Poires');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    JSON.stringify(
      await page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.right > innerWidth + 1 || box.left < -1;
          })
          .map((element) => ({
            tag: element.tagName,
            className: element.className,
            text: element.textContent?.trim().slice(0, 60),
            box: element.getBoundingClientRect().toJSON(),
          })),
      ),
    ),
  ).toBeTruthy();
  await page.getByRole('link', { name: 'Annuler', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Clavier samedi' }),
  ).toBeVisible();
});

test('doubles actions, deux onglets, conflit explicite, erreur et annulation', async ({
  page,
  context,
}) => {
  await page.goto('/inscription');
  await page.getByLabel('Prénom', { exact: true }).fill('Lou');
  await page.getByLabel('Nom', { exact: true }).fill('Test');
  await page.getByLabel('Adresse email').fill(`tabs-${Date.now()}@example.fr`);
  await page.getByLabel('Mot de passe').fill('Passphrase-123');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page
    .getByRole('link', { name: 'Créer une liste', exact: true })
    .click();
  await page.getByLabel('Nom de la liste').fill('Ticket partagé');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    page.getByRole('heading', { name: 'Ticket partagé' }),
  ).toBeVisible();
  const listUrl = page.url();
  await page.getByLabel('Nouveau produit').fill('Pommes');
  await expect(page.getByRole('button', { name: '+ Ajouter' })).toBeEnabled();
  await page.locator('form.quick-add').evaluate((form) => {
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
      form.requestSubmit();
    }
  });
  await expect(page.getByRole('checkbox', { name: 'Pommes' })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Pommes' })).toHaveCount(1);
  const other = await context.newPage();
  await other.goto(listUrl);
  await other.getByRole('link', { name: 'Renommer', exact: true }).click();
  await expect(other.getByLabel('Nom de la liste')).toHaveValue(
    'Ticket partagé',
  );
  await other.getByLabel('Nom de la liste').fill('Version second onglet');
  await page.getByRole('link', { name: 'Renommer', exact: true }).click();
  await page.getByLabel('Nom de la liste').fill('Version premier onglet');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    page.getByRole('heading', { name: 'Version premier onglet' }),
  ).toBeVisible();
  await other.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(other.getByRole('alert')).toContainText('autre onglet');
  await expect(other.getByLabel('Nom de la liste')).toHaveValue(
    'Version second onglet',
  );
  await other.getByRole('link', { name: 'Annuler', exact: true }).click();
  await expect(
    other.getByRole('heading', { name: 'Version premier onglet' }),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page
    .getByRole('button', { name: 'Supprimer Pommes', exact: true })
    .click();
  await expect(page.getByRole('checkbox', { name: 'Pommes' })).toHaveCount(1);
  await page.route('**/api/listes/*/pieces', (route) =>
    route.request().method() === 'POST' ? route.abort() : route.continue(),
  );
  await page.getByLabel('Nouveau produit').fill('Erreur réseau');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: 'Erreur réseau' }),
  ).toHaveCount(0);
  await page.unroute('**/api/listes/*/pieces');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.header')).toBeHidden();
  await expect(page.getByRole('checkbox', { name: 'Pommes' })).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await other.close();
});
