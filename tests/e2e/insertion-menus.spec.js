const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { waitForMarkTide, setTheme } = require('../helpers/marktide-page');
const { monitorPageErrors } = require('../helpers/console-monitor');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const review = process.env.MARKTIDE_INSERTION_REVIEW_DIR;
const imageFile = path.resolve(__dirname, '../../assets/img/icon.jpg');
const source = page => page.evaluate(() => window.MarkTideMonaco.getEditor().getValue());
const trigger = (page, name) => page.getByRole('button', { name, exact: true });

async function setup(page, theme = 'light', width = 1081, height = 800) {
  await page.setViewportSize({ width, height });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await setTheme(page, theme);
  await page.evaluate(() => {
    const editor = window.MarkTideMonaco.getEditor();
    editor.setValue('');
    editor.focus();
  });
  await expect(trigger(page, 'Image')).toHaveAttribute('aria-disabled', 'false');
}

async function shot(page, name) {
  if (!review) return;
  fs.mkdirSync(review, { recursive: true });
  await page.screenshot({ path: path.join(review, name + '.png') });
}

async function insideViewport(page, locator) {
  const bounds = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(7);
  expect(bounds.y).toBeGreaterThanOrEqual(7);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 7);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 7);
}

for (const theme of ['light', 'dark']) for (const width of [1081, 1920]) {
  test(`image source menu and compact dialog at ${width}px in ${theme}`, async ({ page }) => {
    await setup(page, theme, width);
    const monitor = monitorPageErrors(page);
    const button = trigger(page, 'Image');
    await button.click();
    const menu = page.getByRole('menu', { name: 'Image sources' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem')).toHaveText(['Image from file', 'Image from URL']);
    await insideViewport(page, menu);
    await expect.poll(() => menu.evaluate(element => element.getBoundingClientRect().top
      - document.querySelector('[aria-controls="ribbon-image-menu"]').getBoundingClientRect().bottom)).toBe(6);
    await shot(page, `image-menu-${theme}-${width}`);
    await page.locator('.preview-pane').click({ position: { x: 80, y: 150 } });
    await expect(menu).toBeHidden();
    await button.press('ArrowDown');
    await expect(menu.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('End');
    await expect(menu.getByRole('menuitem').last()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
    await button.click();
    await menu.getByRole('menuitem', { name: 'Image from URL' }).click();
    const dialog = page.getByRole('dialog', { name: 'Insert image', exact: true });
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Alternative text', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Alternative text', { exact: true })).toHaveAttribute('placeholder', 'Figure 1: Describe the image');
    await expect(page.getByLabel('Image URL', { exact: true })).toHaveAttribute('placeholder', 'https://example.com/image.png');
    await expect(page.getByLabel('Image URL', { exact: true })).toHaveValue('');
    await expect(page.locator('.editor-insertion-error')).toBeHidden();
    await insideViewport(page, dialog);
    expect((await dialog.boundingBox()).height).toBeLessThan(310);
    await shot(page, `image-dialog-${theme}-${width}`);
    await page.getByLabel('Image URL', { exact: true }).fill('javascript:alert(1)');
    await trigger(page, 'Insert').click();
    await expect(page.locator('.editor-insertion-error')).toBeVisible();
    expect(await source(page)).toBe('');
    await page.getByLabel('Image URL', { exact: true }).fill('assets/img/icon.jpg');
    await trigger(page, 'Insert').click();
    await expect.poll(() => source(page)).toBe('![](<assets/img/icon.jpg>)');
    await expect.poll(() => page.locator('#markdown-preview img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    await trigger(page, 'Undo').click();
    await expect.poll(() => source(page)).toBe('');
    monitor.assertEmpty(expect);
  });

  test(`image file is embedded and keeps optional alt text at ${width}px in ${theme}`, async ({ page, context }) => {
    await setup(page, theme, width);
    await trigger(page, 'Image').click();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('menuitem', { name: 'Image from file' }).click();
    const chooser = await chooserPromise;
    expect(await chooser.element().getAttribute('accept')).toBe('image/*');
    expect(chooser.isMultiple()).toBe(false);
    await chooser.setFiles(imageFile);
    const field = page.getByLabel('Image URL', { exact: true });
    await expect(field).toHaveValue(/^data:image\/jpeg;base64,/);
    await expect(page.getByLabel('Alternative text', { exact: true })).toHaveValue('');
    await page.getByLabel('Alternative text', { exact: true }).fill('Figure 1: MarkTide');
    const embedded = await field.inputValue();
    await trigger(page, 'Insert').click();
    await expect.poll(() => source(page)).toBe(`![Figure 1: MarkTide](<${embedded}>)`);
    const image = page.locator('#markdown-preview img');
    await expect(image).toHaveAttribute('alt', 'Figure 1: MarkTide');
    await expect.poll(() => image.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    const offline = await context.newPage();
    try {
      await offline.setContent(await page.locator('#markdown-preview').innerHTML());
      await expect.poll(() => offline.locator('img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    } finally { await offline.close(); }
    await trigger(page, 'Undo').click();
    await expect.poll(() => source(page)).toBe('');
    await trigger(page, 'Redo').click();
    await expect.poll(() => source(page)).toContain(embedded);
    expect(await page.locator('input[type="file"][accept="image/*"]').count()).toBe(0);
  });

  test(`table grid dimensions keyboard and custom dialog at ${width}px in ${theme}`, async ({ page }) => {
    await setup(page, theme, width);
    const button = trigger(page, 'Table');
    await button.click();
    const popup = page.locator('#ribbon-table-menu');
    const grid = popup.getByRole('grid');
    await expect(grid.getByRole('gridcell')).toHaveCount(80);
    await grid.getByRole('gridcell', { name: '4 columns, 3 rows', exact: true }).hover();
    await expect(popup.locator('output')).toHaveText('4 × 3');
    await expect(grid.locator('[aria-selected="true"]')).toHaveCount(12);
    expect(await grid.getByRole('gridcell').first().evaluate(cell => getComputedStyle(cell).backgroundColor))
      .not.toBe(await grid.getByRole('gridcell').last().evaluate(cell => getComputedStyle(cell).backgroundColor));
    await insideViewport(page, popup);
    await expect.poll(() => popup.evaluate(element => element.getBoundingClientRect().top
      - document.querySelector('[aria-controls="ribbon-table-menu"]').getBoundingClientRect().bottom)).toBe(6);
    await shot(page, `table-grid-${theme}-${width}`);
    await grid.getByRole('gridcell', { name: '4 columns, 3 rows', exact: true }).click();
    await expect(popup).toBeHidden();
    await expect(page.locator('#markdown-preview table thead th')).toHaveCount(4);
    await expect(page.locator('#markdown-preview table tbody tr')).toHaveCount(2);
    await trigger(page, 'Undo').click();
    await expect.poll(() => source(page)).toBe('');
    await button.press('ArrowDown');
    await expect(grid.getByRole('gridcell').first()).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await expect(popup.locator('output')).toHaveText('2 × 2');
    await expect(grid.getByRole('gridcell', { name: '2 columns, 2 rows', exact: true })).toBeFocused();
    await expect(grid.getByRole('gridcell', { name: '2 columns, 2 rows', exact: true })).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Enter');
    await expect(page.locator('#markdown-preview table thead th')).toHaveCount(2);
    await expect(page.locator('#markdown-preview table tbody tr')).toHaveCount(1);
    await trigger(page, 'Undo').click();
    await button.press('ArrowDown');
    await page.keyboard.press('Tab');
    await expect(trigger(page, 'Insert Custom Table')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(grid.getByRole('gridcell').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
    await button.click();
    await trigger(page, 'Insert Custom Table').click();
    const dialog = page.getByRole('dialog', { name: 'Insert table', exact: true });
    await expect(dialog).toBeVisible();
    await insideViewport(page, dialog);
    expect((await dialog.boundingBox()).height).toBeLessThan(280);
    expect((await dialog.boundingBox()).width).toBeLessThanOrEqual(322);
    await shot(page, `table-dialog-${theme}-${width}`);
    await page.getByLabel('Columns', { exact: true }).fill('12');
    await page.getByLabel('Rows', { exact: true }).fill('21');
    await trigger(page, 'Insert').click();
    await expect(page.locator('.editor-insertion-error')).toContainText('200 body cells');
    expect(await source(page)).toBe('');
    await page.getByLabel('Columns', { exact: true }).fill('2');
    await page.getByLabel('Rows', { exact: true }).fill('1');
    await page.getByLabel('Rows', { exact: true }).press('Enter');
    await expect(page.locator('#markdown-preview table thead th')).toHaveCount(2);
    await expect(page.locator('#markdown-preview table tbody tr')).toHaveCount(0);
    await trigger(page, 'Undo').click();
    await expect.poll(() => source(page)).toBe('');
  });
}

for (const theme of ['light', 'dark']) {
  test(`embedded images remain editable and export offline in ${theme}`, async ({ page, browser }) => {
    await setup(page, theme);
    await trigger(page, 'Image').click();
    const pending = page.waitForEvent('filechooser');
    await page.getByRole('menuitem', { name: 'Image from file' }).click();
    await (await pending).setFiles(imageFile);
    await expect(page.getByLabel('Image URL', { exact: true })).toHaveValue(/^data:image\/jpeg;base64,/);
    await trigger(page, 'Insert').click();
    await trigger(page, 'Image').click();
    await page.getByRole('menuitem', { name: 'Image from URL' }).click();
    await expect(page.getByLabel('Image URL', { exact: true })).toHaveValue(/^data:image\/jpeg;base64,/);
    await page.getByLabel('Alternative text', { exact: true }).fill('Local image');
    await trigger(page, 'Insert').click();
    await expect(page.locator('#markdown-preview img')).toHaveAttribute('alt', 'Local image');
    const html = await captureHtmlExport(page);
    const prepared = await capturePdfPreparation(page, 'Embedded Image', { includeDocumentHtml: true });
    const offline = await browser.newContext({ offline: true });
    const exported = await offline.newPage();
    try {
      for (const document of [html, prepared.documentHtml]) {
        await exported.setContent(document, { waitUntil: 'load' });
        await expect(exported.locator('img[alt="Local image"]')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
        await expect.poll(() => exported.locator('img[alt="Local image"]').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
        await expect(exported.locator('.ribbon-menu, .editor-insertion-dialog')).toHaveCount(0);
      }
    } finally { await offline.close(); }
  });
}

for (const theme of ['light', 'dark']) for (const width of [1081, 1920]) {
  test(`welcome document insertion review at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 800 });
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await trigger(page, 'Image').click();
    await expect(page.locator('#ribbon-image-menu')).toBeVisible();
    await shot(page, `welcome-image-menu-${theme}-${width}`);
    await page.getByRole('menuitem', { name: 'Image from URL' }).click();
    await expect(page.locator('.editor-insertion-dialog')).toBeVisible();
    await shot(page, `welcome-image-dialog-${theme}-${width}`);
    await page.keyboard.press('Escape');
    await trigger(page, 'Table').click();
    await page.getByRole('gridcell', { name: '4 columns, 3 rows', exact: true }).hover();
    await shot(page, `welcome-table-grid-${theme}-${width}`);
    await trigger(page, 'Insert Custom Table').click();
    await expect(page.locator('.editor-insertion-dialog')).toBeVisible();
    await shot(page, `welcome-table-dialog-${theme}-${width}`);
    await page.keyboard.press('Escape');
  });
}

test('file cancellation invalid data and changed document leave source untouched', async ({ page }) => {
  await setup(page);
  async function pick(file, before) {
    await trigger(page, 'Image').click();
    const pending = page.waitForEvent('filechooser');
    await page.getByRole('menuitem', { name: 'Image from file' }).click();
    const chooser = await pending;
    if (before) await before();
    await chooser.setFiles(file);
  }
  await trigger(page, 'Image').click();
  const cancelled = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: 'Image from file' }).click();
  await (await cancelled).element().evaluate(input => input.dispatchEvent(new Event('cancel')));
  await expect(trigger(page, 'Image')).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('input[type="file"][accept="image/*"]')).toHaveCount(0);
  await pick([]);
  await expect(trigger(page, 'Image')).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('.editor-insertion-dialog')).toHaveCount(0);
  await pick({ name: 'fake.png', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(page.locator('#editor-command-status')).toHaveText('Choose an image file.');
  await pick({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') });
  await expect(page.locator('#editor-command-status')).toContainText('could not be opened');
  await pick(imageFile, () => page.evaluate(() => window.MarkTideMonaco.getEditor().setValue('Changed')));
  await expect(page.locator('#editor-command-status')).toContainText('document changed');
  await expect(page.locator('.editor-insertion-dialog')).toHaveCount(0);
  expect(await source(page)).toBe('Changed');
  await pick(imageFile, () => page.evaluate(() => {
    window.MarkTideCommands.destroy();
    window.MarkTideCommands.init(window.MarkTideMonaco.getEditor());
  }));
  await expect(trigger(page, 'Image')).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('.editor-insertion-dialog')).toHaveCount(0);
  expect(await source(page)).toBe('Changed');
});

test('PNG and SVG files stay embedded image content and unsafe data URLs are rejected', async ({ page }) => {
  await setup(page);
  for (const file of [
    { name: 'pixel.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') },
    { name: 'shape.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><script>window.embeddedImageScript = true;</script><rect width="80" height="80" fill="blue"/></svg>') },
  ]) {
    await trigger(page, 'Image').click();
    const pending = page.waitForEvent('filechooser');
    await page.getByRole('menuitem', { name: 'Image from file' }).click();
    await (await pending).setFiles(file);
    await expect(page.getByLabel('Image URL', { exact: true })).toHaveValue(/^data:image\//);
    await trigger(page, 'Insert').click();
    await expect.poll(() => page.locator('#markdown-preview img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.embeddedImageScript)).toBeUndefined();
    await trigger(page, 'Undo').click();
    await expect.poll(() => source(page)).toBe('');
  }
  const results = await page.evaluate(() => ['data:text/html;base64,PHNjcmlwdD4=',
    'data:image/png;base64,abc" onerror="alert(1)', 'javascript:alert(1)'].map(url => {
    try { window.MarkTideInsertionTools.destination(url, true); return false; }
    catch (error) { return true; }
  }));
  expect(results).toEqual([true, true, true]);
});

for (const theme of ['light', 'dark']) {
  test(`readonly and narrow custom dialogs in ${theme}`, async ({ page }) => {
    await setup(page, theme);
    await page.evaluate(() => window.MarkTideMonaco.getEditor().updateOptions({ readOnly: true }));
    for (const name of ['Image', 'Table']) {
      await expect(trigger(page, name)).toHaveAttribute('aria-disabled', 'true');
      await trigger(page, name).click({ force: true });
      await expect(page.locator(`#ribbon-${name.toLowerCase()}-menu`)).toBeHidden();
    }
    await page.evaluate(() => window.MarkTideMonaco.getEditor().updateOptions({ readOnly: false }));
    await page.setViewportSize({ width: 390, height: 540 });
    for (const id of ['image', 'table']) {
      await page.evaluate(id => { window.MarkTideCommands.execute(id); }, id);
      const dialog = page.locator('.editor-insertion-dialog');
      await expect(dialog).toBeVisible();
      await insideViewport(page, dialog);
      await page.keyboard.press('Escape');
      expect(await source(page)).toBe('');
    }
  });
}

test.describe('touch insertion controls', () => {
  test.use({ hasTouch: true });
  for (const theme of ['light', 'dark']) test(`single tap grid and menus in ${theme}`, async ({ page }) => {
    await setup(page, theme, 1081, 600);
    await trigger(page, 'Table').tap();
    const popup = page.locator('#ribbon-table-menu');
    const cell = popup.getByRole('gridcell', { name: '3 columns, 2 rows', exact: true });
    const bounds = await cell.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    await insideViewport(page, popup);
    await shot(page, `touch-table-${theme}`);
    await cell.tap();
    await expect(page.locator('#markdown-preview table th')).toHaveCount(3);
    await expect(page.locator('#markdown-preview table tbody tr')).toHaveCount(1);
    await trigger(page, 'Undo').tap();
    await trigger(page, 'Image').tap();
    await page.getByRole('menuitem', { name: 'Image from URL' }).tap();
    await expect(page.locator('.editor-insertion-dialog')).toBeVisible();
    await trigger(page, 'Cancel').tap();
    await expect.poll(() => source(page)).toBe('');
  });
});

for (const theme of ['light', 'dark']) for (const width of [1081, 1440, 1920]) for (const gutter of [false, true]) {
  test(`table popup edge clearance at ${width}px in ${theme}, scrollbar gutter ${gutter}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    if (gutter) await page.addStyleTag({ content: 'html { overflow-y: scroll; scrollbar-gutter: stable; }' });
    await trigger(page, 'Table').click();
    const popup = page.locator('#ribbon-table-menu');
    await expect(popup).toBeVisible();
    await expect.poll(() => popup.evaluate(panel => {
      const bounds = panel.getBoundingClientRect();
      const anchor = document.querySelector('[aria-controls="ribbon-table-menu"]').getBoundingClientRect();
      const root = document.documentElement;
      const viewport = Math.min(root.clientWidth, root.getBoundingClientRect().width);
      return bounds.left >= 20 && bounds.right <= viewport - 20
        && anchor.left >= bounds.left && anchor.right <= bounds.right;
    })).toBe(true);
    if (width >= 1440) {
      await expect.poll(() => popup.evaluate(panel => panel.getBoundingClientRect().left
        - document.querySelector('[aria-controls="ribbon-table-menu"]').getBoundingClientRect().left)).toBe(0);
    }
    await expect.poll(() => popup.evaluate(panel => panel.getBoundingClientRect().top
      - document.querySelector('[aria-controls="ribbon-table-menu"]').getBoundingClientRect().bottom)).toBe(6);
    await popup.getByRole('gridcell', { name: '4 columns, 3 rows', exact: true }).hover();
    await shot(page, `table-position-${theme}-${width}-gutter-${gutter}`);
    await page.keyboard.press('Escape');
    await expect(trigger(page, 'Table')).toBeFocused();
    await trigger(page, 'Table').click();
    await popup.getByRole('gridcell', { name: '3 columns, 2 rows', exact: true }).click();
    const inserted = page.locator('#markdown-preview table').first();
    await expect(inserted.locator('th')).toHaveCount(3);
    await expect(inserted.locator('tbody tr')).toHaveCount(1);
  });
}
