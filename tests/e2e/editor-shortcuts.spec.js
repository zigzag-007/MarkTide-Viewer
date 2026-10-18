const { test, expect } = require('playwright/test');
const { waitForMarkTide, setTheme } = require('../helpers/marktide-page');

async function select(page, text = 'alpha beta') {
  await page.evaluate(text => {
    const editor = window.MarkTideMonaco.getEditor();
    editor.getModel().setValue(text);
    editor.getModel().setEOL(monaco.editor.EndOfLineSequence.LF);
    editor.setSelection(new monaco.Selection(1, 1, 1, 6));
    editor.focus();
  }, text);
  await page.getByRole('textbox', { name: 'Editor content', exact: true }).focus();
  await expect.poll(() => page.evaluate(() => window.MarkTideMonaco.getEditor().hasTextFocus())).toBe(true);
}

const value = page => page.evaluate(() => window.MarkTideMonaco.getEditor().getValue());

for (const theme of ['light', 'dark']) for (const width of [390, 768, 1080]) {
  test('narrow views preserve hidden legacy controls and shared shortcut history at ' + width + ' in ' + theme, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await select(page);
    const bold = page.locator('#format-bold');
    await expect(bold).toHaveAttribute('data-editor-command', 'bold');
    await expect(bold).not.toHaveAttribute('title');
    await expect(bold).toBeHidden();
    await page.keyboard.press('Control+b');
    await expect.poll(() => value(page)).toBe('**alpha** beta');
    await expect(bold).toHaveAttribute('aria-pressed', 'true');
    await expect(bold).toHaveAttribute('data-ribbon-tip', 'Bold · Ctrl+B');
    await expect(page.locator('.ribbon-tooltip')).toBeHidden();
    await page.keyboard.press('Control+z');
    await expect.poll(() => value(page)).toBe('alpha beta');
    await page.keyboard.press('Control+y');
    await expect.poll(() => value(page)).toBe('**alpha** beta');
    await page.keyboard.press('Control+k');
    const dialog = page.locator('.editor-insertion-dialog');
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(16);
    expect(box.x + box.width).toBeLessThanOrEqual(width - 16);
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y + box.height / 2 - 422)).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
  });
}

for (const mac of [false, true]) {
  test((mac ? 'simulated Mac' : 'Linux') + ' shortcut mappings edit once and preserve native history', async ({ page }) => {
    if (mac) await page.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
      Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36' });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/index.html');
    await waitForMarkTide(page);
    const modifier = mac ? 'Meta' : 'Control';
    for (const [key, result] of [['b', '**alpha** beta'], ['i', '*alpha* beta'], ['u', '<u>alpha</u> beta'],
      ['\x60', '\x60alpha\x60 beta'], ['e', ':::marktide-align center\nalpha beta\n:::'],
      ['j', ':::marktide-align justify\nalpha beta\n:::']]) {
      await select(page);
      await page.keyboard.press(modifier + '+' + key);
      await expect.poll(() => value(page)).toBe(result);
      await page.keyboard.press(modifier + '+z');
      await expect.poll(() => value(page)).toBe('alpha beta');
      await page.keyboard.press(mac ? 'Meta+Shift+z' : 'Control+y');
      await expect.poll(() => value(page)).toBe(result);
    }
    await select(page);
    await page.keyboard.press(modifier + '+Enter');
    await expect.poll(() => value(page)).toBe('alpha beta\n\n<!-- marktide-page-break -->\n\n');
    await page.keyboard.press(modifier + '+z');
    await page.keyboard.press('Shift+Enter');
    await expect.poll(() => value(page)).toBe('  \n beta');
    await select(page);
    await page.keyboard.press(modifier + '+k');
    await expect(page.locator('.editor-insertion-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await select(page);
    await page.keyboard.press(modifier + '+f');
    await expect(page.getByRole('textbox', { name: 'Find', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await select(page);
    await page.keyboard.press(mac ? 'Meta+Alt+f' : 'Control+h');
    await expect(page.locator('.find-widget .replace-part')).toBeVisible();
    await page.keyboard.press('Escape');
    if (mac) {
      await select(page);
      await page.keyboard.press('Control+b');
      expect(await value(page)).toBe('alpha beta');
      await expect(page.getByRole('button', { name: 'Replace', exact: true })).toHaveAttribute('aria-keyshortcuts', 'Meta+Alt+F');
    }
  });
}

test('browser clipboard shortcuts copy cut rich paste and plain paste once', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await page.evaluate(async () => { window.originalTestClipboard = await navigator.clipboard.read(); });
  try {
  await select(page);
  await page.keyboard.press('Control+c');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('alpha');
  expect(await value(page)).toBe('alpha beta');
  await page.keyboard.press('Control+x');
  await expect.poll(() => value(page)).toBe(' beta');
  await page.keyboard.press('Control+z');
  await expect.poll(() => value(page)).toBe('alpha beta');
  await page.evaluate(() => navigator.clipboard.write([new ClipboardItem({
    'text/plain': new Blob(['Rich text'], { type: 'text/plain' }),
    'text/html': new Blob(['<p><strong>Rich</strong> text</p>'], { type: 'text/html' }),
  })]));
  await select(page);
  await page.keyboard.press('Control+v');
  await expect.poll(() => value(page)).toBe('**Rich** text beta');
  await page.keyboard.press('Control+z');
  await expect.poll(() => value(page)).toBe('alpha beta');
  await page.keyboard.press('Control+Shift+v');
  await expect.poll(() => value(page)).toBe('Rich text beta');
  await page.keyboard.press('Control+z');
  await expect.poll(() => value(page)).toBe('alpha beta');
  await page.evaluate(() => {
    const editor = window.MarkTideMonaco.getEditor();
    editor.getModel().setValue('\x60\x60\x60\nalpha\n\x60\x60\x60');
    editor.setSelection(new monaco.Selection(2, 1, 2, 6));
    editor.focus();
  });
  await page.getByRole('textbox', { name: 'Editor content', exact: true }).focus();
  await page.keyboard.press('Control+v');
  await expect.poll(() => value(page)).toBe('\x60\x60\x60\nRich text\n\x60\x60\x60');
  await expect(page.locator('#markdown-preview pre code')).toHaveText('Rich text\n');
  } finally {
    await page.evaluate(async () => {
      if (window.originalTestClipboard.length) await navigator.clipboard.write(window.originalTestClipboard);
      else await navigator.clipboard.writeText('');
    });
  }
});

test('Save retains its document scope from Preview and preserves source', async ({ page }) => {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await select(page);
  await page.locator('#markdown-preview').click();
  await expect.poll(() => page.evaluate(() => window.MarkTideMonaco.getEditor().hasTextFocus())).toBe(false);
  const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  expect(download.suggestedFilename()).toMatch(/\.md$/);
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString('utf8')).toBe('alpha beta');
  expect(await value(page)).toBe('alpha beta');
});
