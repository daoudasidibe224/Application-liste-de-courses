import { test, expect } from '@playwright/test';
test('le ticket de connexion est stylé sous la CSP de production', async ({ page }) => {
  for (const width of [1440, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto('/login');
    expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
    await expect(page.getByRole('heading', { name: 'Se connecter', exact: true })).toBeVisible();
    await expect(page.locator('.auth-card')).toHaveCSS('border-top-width', '5px');
    await expect(page.locator('.auth-card')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.getByRole('heading', { name: 'Carnet de courses', exact: true })).toHaveCSS('font-family', '"Barlow Condensed", sans-serif');
    const layout = await page.evaluate(() => {
      const email = document.querySelector<HTMLInputElement>('input[name="email"]')!.getBoundingClientRect();
      const password = document.querySelector<HTMLInputElement>('input[name="password"]')!.getBoundingClientRect();
      const card = document.querySelector('.auth-card')!.getBoundingClientRect();
      return { fieldsStacked: password.top > email.bottom, centered: Math.abs(card.left + card.width / 2 - innerWidth / 2) < 2, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(layout).toEqual({ fieldsStacked: true, centered: true, overflow: false });
  }
  await page.getByRole('link', { name: 'Créer un compte', exact: true }).click();
  await expect(page).toHaveURL(/inscription$/);
  await expect(page.locator('.auth-card')).toHaveCSS('border-top-width', '5px');
});

test('parcours réel : compte, listes, produits, filtres et déconnexion', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inscription');
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
  await expect(page.getByRole('alert')).toBeFocused();
  for (const width of [1440, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await expect(
    page.getByRole('button', { name: 'Se connecter', exact: true }),
  ).toBeEnabled();
});

test('clavier et persistance à 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/inscription');
  await page.getByLabel('Adresse email').focus();
  await page.keyboard.type(`keyboard-${Date.now()}@example.fr`);
  await page.keyboard.press('Tab');
  await page.keyboard.type('Passphrase-123');
  await expect(
    page.getByRole('button', { name: 'Créer mon compte' }),
  ).toBeEnabled();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Mot de passe')).toHaveAttribute('type', 'text');
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

test('ticket en magasin : inscription simple, quantités, rayons, tri, navigation et préférences persistées', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inscription');
  await expect(page.locator('form input')).toHaveCount(2);
  await page.getByLabel('Adresse email').fill(`shop-${Date.now()}@example.fr`);
  await page.getByLabel('Mot de passe').fill('Passphrase-123');
  await page.getByRole('button', { name: 'Afficher le mot de passe' }).click();
  await expect(page.getByLabel('Mot de passe')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Masquer le mot de passe' }).click();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page
    .getByRole('link', { name: 'Créer une liste', exact: true })
    .click();
  await page.getByLabel('Nom de la liste').fill('Au marché');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('heading', { name: 'Au marché' })).toBeVisible();
  await page
    .getByRole('button', { name: 'Quantité, unité et rayon', exact: true })
    .click();
  await page.getByLabel('Quantité', { exact: true }).fill('1.25');
  await page.getByLabel('Unité', { exact: true }).selectOption('kg');
  await page
    .getByLabel('Rayon', { exact: true })
    .selectOption('Fruits et légumes');
  await page.getByLabel('Nouveau produit').fill('Pommes');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await expect(page.locator('.product-meta').first()).toContainText('1.25 kg');
  await expect(page.getByLabel('Nouveau produit')).toBeFocused();
  await page.getByLabel('Rayon', { exact: true }).selectOption('Frais');
  await page.getByLabel('Unité', { exact: true }).selectOption('pièce');
  await page.getByLabel('Quantité', { exact: true }).fill('6');
  await page.getByLabel('Nouveau produit').fill('Œufs');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await expect(
    page.getByRole('heading', { name: 'Frais 1', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Replier quantité et rayon' }).click();
  await page
    .getByRole('link', { name: 'Modifier Pommes', exact: true })
    .click();
  await expect(page.getByLabel('Quantité', { exact: true })).toHaveValue(
    '1.25',
  );
  await page.getByLabel('Quantité', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('.product-meta').first()).toContainText('2 kg');
  await page.reload();
  await expect(page.locator('.product-meta').first()).toContainText('2 kg');
  await page.getByRole('button', { name: 'Mode magasin', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Modifier Pommes', exact: true }),
  ).toBeHidden();
  await page.getByRole('checkbox', { name: /Pommes/ }).check();
  await expect(page.getByRole('checkbox', { name: /Pommes/ })).toBeChecked();
  await page.getByLabel('Organiser le ticket').selectOption('remaining');
  await expect(page.locator('.products li').first()).toContainText('Œufs');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Quitter le mode magasin' }),
  ).toBeVisible();
  await expect(page.getByLabel('Organiser le ticket')).toHaveValue('remaining');
  await expect(page.getByLabel('Nouveau produit')).toBeHidden();
  await expect(
    page.getByLabel('Ouvrir une liste').locator('option:checked'),
  ).toHaveText('Au marché');
  const current = page.url();
  const other = await context.newPage();
  await other.goto(current);
  await expect(other.getByRole('checkbox', { name: /Pommes/ })).toBeChecked();
  await other.close();
  await page
    .getByRole('link', { name: '+ Nouvelle liste', exact: true })
    .click();
  await page.getByLabel('Nom de la liste').fill('À la maison');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    page.getByRole('heading', { name: 'À la maison' }),
  ).toBeVisible();
  const options = await page
    .getByRole('combobox', { name: 'Ouvrir une liste', exact: true })
    .locator('option')
    .allTextContents();
  expect(options).toContain('Au marché');
  await page
    .getByRole('combobox', { name: 'Ouvrir une liste', exact: true })
    .selectOption({ label: 'Au marché' });
  await expect(page.getByRole('heading', { name: 'Au marché' })).toBeVisible();
  for (const width of [1440, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.carnet-navigation')).toBeHidden();
  await expect(page.locator('.product-meta').first()).toContainText('6 pièce');
  await expect(page.getByRole('checkbox', { name: /Pommes/ })).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
});

test('auth compacte, session restaurée et fermeture depuis un autre onglet', async ({
  page,
  context,
}) => {
  for (const path of ['/login', '/inscription']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const button = page.getByRole('button', {
      name: path === '/login' ? 'Se connecter' : 'Créer mon compte',
      exact: true,
    });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box && box.y + box.height).toBeLessThan(844);
    for (const width of [1440, 800, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(button).toBeInViewport();
      const visibleButton = await button.boundingBox();
      if (width <= 390)
        expect(
          visibleButton && visibleButton.y + visibleButton.height,
        ).toBeLessThan(844);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
  await page
    .getByLabel('Adresse email')
    .fill('session-tabs-' + Date.now() + '@example.fr');
  await page.getByLabel('Mot de passe').fill('Passphrase-123');
  await expect(
    page.getByRole('button', { name: 'Créer mon compte' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/listes/);
  const other = await context.newPage();
  await other.goto('/login');
  await expect(other).toHaveURL(/listes/);
  await page.evaluate(() => localStorage.setItem('x-access-token', 'expired'));
  await page.route('**/api/utilisateurs/moi/access-token', (route) =>
    route.abort(),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Connexion indisponible');
  expect(
    await page.evaluate(() => !!localStorage.getItem('x-refresh-token')),
  ).toBeTruthy();
  await page.unroute('**/api/utilisateurs/moi/access-token');
  await page.reload();
  await expect(page).toHaveURL(/listes/);
  await expect(page.getByRole('button', { name: 'Déconnexion' })).toBeVisible();
  await page.getByRole('button', { name: 'Déconnexion' }).click();
  await expect(other).toHaveURL(/login/);
  await expect(
    other.getByRole('button', { name: 'Se connecter', exact: true }),
  ).toBeVisible();
  await expect(other.getByRole('button', { name: 'Déconnexion' })).toHaveCount(
    0,
  );
  await other.close();
});

test('inventaire complet : recherche, pages, duplication, archive et reprise après erreur', async ({
  page,
}) => {
  await page.goto('/inscription');
  await page
    .getByLabel('Adresse email')
    .fill('inventory-' + Date.now() + '@example.fr');
  await page.getByLabel('Mot de passe').fill('Passphrase-123');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page
    .getByRole('link', { name: 'Créer une liste', exact: true })
    .click();
  await page.getByLabel('Nom de la liste').fill('Marché hebdomadaire');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByLabel('Nouveau produit').fill('Tomates');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await page.getByRole('checkbox', { name: /Tomates/ }).check();
  await page
    .getByRole('link', { name: 'Mes listes', exact: false })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Mes listes', exact: true }),
  ).toBeVisible();
  const card = page
    .locator('.inventory-card')
    .filter({ hasText: 'Marché hebdomadaire' });
  await expect(card).toContainText('0 à acheter · 1 / 1');
  await card.locator('summary').click();
  await card.getByRole('button', { name: 'Dupliquer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Marché hebdomadaire (copie)' }),
  ).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: /Tomates/ }),
  ).not.toBeChecked();
  await page
    .getByRole('link', { name: 'Mes listes', exact: false })
    .first()
    .click();
  const copy = page
    .locator('.inventory-card')
    .filter({ hasText: 'Marché hebdomadaire (copie)' });
  await copy.locator('summary').click();
  await copy.getByRole('button', { name: 'Archiver', exact: true }).click();
  await page.getByLabel('Afficher les listes').selectOption('archived');
  await expect(copy).toBeVisible();
  await page.reload();
  await page.getByLabel('Afficher les listes').selectOption('archived');
  await expect(copy).toBeVisible();
  await copy.locator('summary').click();
  await copy.getByRole('button', { name: 'Restaurer', exact: true }).click();
  await page.getByLabel('Afficher les listes').selectOption('all');
  await page
    .getByRole('searchbox', { name: 'Rechercher une liste' })
    .fill('introuvable');
  await expect(
    page.getByRole('heading', { name: 'Aucune liste trouvée' }),
  ).toBeVisible();
  await page.getByRole('searchbox', { name: 'Rechercher une liste' }).fill('');
  const token = await page.evaluate(() =>
    localStorage.getItem('x-access-token'),
  );
  if (!token) throw Error('Session absente');
  for (let i = 0; i < 13; i++)
    await page.request.post('/api/listes', {
      headers: { 'x-access-token': token },
      data: { titre: 'Ticket ' + i },
    });
  await page.reload();
  await page.getByLabel('Afficher les listes').selectOption('all');
  await expect(page.locator('.inventory-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'Suivante →' }).click();
  await expect(page.locator('.inventory-card')).toHaveCount(3);
  for (const width of [1440, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('.inventory-card').first().locator('summary').click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.locator('.inventory-card').first().locator('summary').click();
  }
  await page.route('**/api/listes', (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Connexion indisponible');
  await page.unroute('**/api/listes');
  await page.getByRole('button', { name: 'Réessayer le chargement' }).click();
  await expect(
    page.getByRole('heading', { name: 'Mes listes', exact: true }),
  ).toBeVisible();
});
