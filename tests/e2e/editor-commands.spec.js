const { test, expect } = require('playwright/test');
const { waitForMarkTide, setTheme } = require('../helpers/marktide-page');
const { monitorPageErrors } = require('../helpers/console-monitor');

async function setup(page, theme, width, text = 'alpha beta') {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await setTheme(page, theme);
  await expect(page.locator('.app-container')).toBeVisible();
  await page.evaluate(source => {
    const editor = window.MarkTideMonaco.getEditor();
    editor.getModel().setValue(source);
    editor.getModel().setEOL(source.includes('\r\n') ? monaco.editor.EndOfLineSequence.CRLF : monaco.editor.EndOfLineSequence.LF);
    editor.setSelection(new monaco.Selection(1, 1, 1, 6));
    editor.focus();
  }, text);
}

async function source(page) {
  return page.evaluate(() => window.MarkTideMonaco.getEditor().getValue());
}

for (const theme of ['light', 'dark']) for (const width of [1081, 1920]) {
  test(`six inline commands share selection and one step history at ${width}px in ${theme}`, async ({ page }) => {
    await setup(page, theme, width);
    for (const [label, prefix, suffix, tag] of [['Bold', '**', '**', 'strong'], ['Italic', '*', '*', 'em'],
      ['Underline', '<u>', '</u>', 'u'], ['Strikethrough', '~~', '~~', 'del'],
      ['Highlight', '==', '==', 'mark'], ['Inline Code', '`', '`', 'code']]) {
      const button = page.getByRole('button', { name: label, exact: true });
      await expect(button).toHaveAttribute('aria-disabled', 'false');
      await button.click();
      await expect.poll(() => source(page)).toBe(prefix + 'alpha' + suffix + ' beta');
      await expect(page.locator(`#markdown-preview ${tag}`).first()).toHaveText('alpha');
      expect(await page.evaluate(() => {
        const editor = window.MarkTideMonaco.getEditor();
        return editor.getModel().getValueInRange(editor.getSelection());
      })).toBe('alpha');
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await expect.poll(() => source(page)).toBe('alpha beta');
      await button.focus();
      await button.press('Enter');
      await expect.poll(() => source(page)).toBe(prefix + 'alpha' + suffix + ' beta');
      await page.keyboard.press('Control+z');
      await expect.poll(() => source(page)).toBe('alpha beta');
      await page.getByRole('button', { name: 'Redo', exact: true }).click();
      await expect.poll(() => source(page)).toBe(prefix + 'alpha' + suffix + ' beta');
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await expect.poll(() => source(page)).toBe('alpha beta');
    }
  });

  test(`keyboard activation and editor shortcut execute once at ${width}px in ${theme}`, async ({ page }) => {
    await setup(page, theme, width);
    const bold = page.getByRole('button', { name: 'Bold', exact: true });
    await bold.focus();
    await bold.press('Enter');
    await expect.poll(() => source(page)).toBe('**alpha** beta');
    await expect(bold).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Control+b');
    await expect.poll(() => source(page)).toBe('alpha beta');
    await page.keyboard.press('Control+z');
    await expect.poll(() => source(page)).toBe('**alpha** beta');
    await page.keyboard.press('Control+Shift+z');
    await expect.poll(() => source(page)).toBe('alpha beta');
  });

  test(`styles lists alignment and breaks edit source at ${width}px in ${theme}`, async ({ page }) => {
    await setup(page, theme, width);
    for (const [label, expected, selector] of [['Bullet List', '- alpha beta', 'ul li'],
      ['Numbered List', '1. alpha beta', 'ol li'], ['Task List', '- [ ] alpha beta', 'input[type="checkbox"]'],
      ['Blockquote', '> alpha beta', 'blockquote']]) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect.poll(() => source(page)).toBe(expected);
      await expect(page.locator(`#markdown-preview ${selector}`)).toBeVisible();
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await expect.poll(() => source(page)).toBe('alpha beta');
      const control = page.getByRole('button', { name: label, exact: true });
      await control.focus();
      await control.press('Space');
      await expect.poll(() => source(page)).toBe(expected);
      await page.keyboard.press('Control+z');
      await expect.poll(() => source(page)).toBe('alpha beta');
    }
    await page.getByRole('button', { name: 'Styles', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Heading 2', exact: true }).click();
    await expect.poll(() => source(page)).toBe('## alpha beta');
    await expect(page.locator('#markdown-preview h2')).toHaveText('alpha beta');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    for (const [label, alignment] of [['Align Center', 'center'], ['Align Right', 'right'], ['Justify', 'justify'], ['Align Left', 'left']]) {
      await page.getByRole('button', { name: label, exact: true }).click();
      if (alignment === 'left') await expect.poll(() => source(page)).toBe('alpha beta');
      else {
        await expect.poll(() => source(page)).toContain(`:::marktide-align ${alignment}`);
        await expect(page.locator('#markdown-preview .marktide-aligned-block')).toHaveCSS('text-align', alignment);
        await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
      }
    }
    await page.evaluate(() => {
      const editor = window.MarkTideMonaco.getEditor();
      editor.getModel().setValue('before\n\nafter');
      editor.setPosition({ lineNumber: 1, column: 7 });
      editor.focus();
    });
    await page.getByRole('button', { name: 'Page Break', exact: true }).click();
    await expect.poll(() => source(page)).toContain('before\n\n<!-- marktide-page-break -->\n\n');
    await expect(page.locator('#markdown-preview .marktide-page-break')).toBeVisible();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.evaluate(() => window.MarkTideMonaco.getEditor().setPosition({ lineNumber: 1, column: 7 }));
    await page.getByRole('button', { name: 'Line Break', exact: true }).click();
    await expect.poll(() => source(page)).toBe('before  \n\n\nafter');
  });

  test(`insertion dialogs preserve selections cancel and native history at ${width}px in ${theme}`, async ({ page }) => {
    await setup(page, theme, width);
    const monitor = monitorPageErrors(page);
    for (const label of ['Link', 'Image', 'Code Block', 'Table']) {
      await page.getByRole('button', { name: label, exact: true }).click();
      if (label === 'Image') await page.getByRole('menuitem', { name: 'Image from URL' }).click();
      if (label === 'Table') await page.getByRole('button', { name: 'Insert Custom Table' }).click();
      await expect(page.locator('.editor-insertion-dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      expect(await source(page)).toBe('alpha beta');
      expect(await page.evaluate(() => window.MarkTideMonaco.getEditor().getModel().canUndo())).toBe(false);
      const control = page.getByRole('button', { name: label, exact: true });
      await control.focus();
      await control.press('Enter');
      if (label === 'Image') await page.getByRole('menuitem', { name: 'Image from URL' }).click();
      if (label === 'Table') await page.getByRole('button', { name: 'Insert Custom Table' }).click();
      await expect(page.locator('.editor-insertion-dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      expect(await source(page)).toBe('alpha beta');
      expect(await page.evaluate(() => window.MarkTideMonaco.getEditor().getModel().canUndo())).toBe(false);
    }
    await page.getByRole('button', { name: 'Link', exact: true }).click();
    await expect(page.getByLabel('Link text')).toHaveValue('alpha');
    await page.getByLabel('URL', { exact: true }).fill('javascript:alert(1)');
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
    await expect(page.locator('.editor-insertion-error')).not.toBeEmpty();
    expect(await source(page)).toBe('alpha beta');
    await page.getByLabel('URL', { exact: true }).fill('https://example.com/a%20b?q=x(y)');
    await page.getByLabel('URL', { exact: true }).press('Enter');
    await expect.poll(() => source(page)).toBe('[alpha](<https://example.com/a%20b?q=x%28y%29>) beta');
    await expect(page.locator('#markdown-preview a')).toHaveText('alpha');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Image', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Image from URL' }).click();
    await page.getByLabel('Image URL', { exact: true }).fill('assets/img/icon.jpg');
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
    await expect.poll(() => source(page)).toBe('![alpha](<assets/img/icon.jpg>) beta');
    await expect(page.locator('#markdown-preview img')).toHaveAttribute('alt', 'alpha');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Code Block', exact: true }).click();
    await page.getByLabel('Language (optional)').fill('markdown');
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
    await expect.poll(() => source(page)).toContain('```markdown\nalpha\n```');
    await expect(page.locator('#markdown-preview code')).toHaveText('alpha');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Table', exact: true }).click();
    await page.getByRole('button', { name: 'Insert Custom Table' }).click();
    await page.getByLabel('Rows', { exact: true }).fill('3');
    await page.getByLabel('Columns', { exact: true }).fill('2');
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
    await expect(page.locator('#markdown-preview table')).toBeVisible();
    await expect(page.locator('#markdown-preview table tbody tr')).toHaveCount(2);
    await expect(page.locator('#markdown-preview table tbody tr').first()).toContainText('alpha');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect.poll(() => source(page)).toBe('alpha beta');
    monitor.assertEmpty(expect);
  });

  test(`clipboard commands are atomic and preserve literal plain text at ${width}px in ${theme}`, async ({ page }) => {
    await setup(page, theme, width);
    await page.evaluate(() => {
      window.clipboardWrites = [];
      Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async text => window.clipboardWrites.push(text) });
      Object.defineProperty(navigator.clipboard, 'readText', { configurable: true, value: async () => '**literal**\nnext' });
      Object.defineProperty(navigator.clipboard, 'read', { configurable: true, value: async () => [{
        types: ['text/html', 'text/plain'], getType: async type => new Blob([type === 'text/html'
          ? '<h2>Title</h2><p><b>Bold</b> <i>Italic</i> <u>Under</u> <del>Strike</del></p>' : 'fallback'], { type }),
      }] });
    });
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    expect(await source(page)).toBe('alpha beta');
    expect(await page.evaluate(() => window.clipboardWrites)).toEqual(['alpha']);
    await page.getByRole('button', { name: 'Cut', exact: true }).click();
    await expect.poll(() => source(page)).toBe(' beta');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Paste options', exact: true }).click();
    await page.getByRole('menuitem', { name: /^Paste without formatting/ }).click();
    await expect.poll(() => source(page)).toBe('**literal**\nnext beta');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Paste', exact: true }).click();
    await expect.poll(() => source(page)).toContain('## Title');
    await expect(page.locator('#markdown-preview h2')).toHaveText('Title');
    await expect(page.locator('#markdown-preview strong')).toHaveText('Bold');
    await expect(page.locator('#markdown-preview del')).toHaveText('Strike');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async () => { throw new Error('denied'); } }));
    await page.getByRole('button', { name: 'Cut', exact: true }).click();
    await expect(page.locator('#editor-command-status')).toContainText('No text was removed');
    expect(await source(page)).toBe('alpha beta');
  });
}

test('Find and Replace open native actions without edits and own their input keys', async ({ page }) => {
  await setup(page, 'light', 1440);
  expect(await page.evaluate(() => {
    const editor = window.MarkTideMonaco.getEditor();
    return ['actions.find', 'editor.action.startFindReplaceAction'].every(id => Boolean(editor.getAction(id)));
  })).toBe(true);
  await page.getByRole('button', { name: 'Find', exact: true }).click();
  const find = page.getByRole('textbox', { name: 'Find', exact: true });
  await expect(find).toBeVisible();
  await expect(find).toHaveValue('alpha');
  await find.fill('beta');
  await find.press('Control+b');
  expect(await source(page)).toBe('alpha beta');
  await find.press('Escape');
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.locator('.find-widget .replace-part')).toBeVisible();
  expect(await source(page)).toBe('alpha beta');
});

test('native Find options navigation and Replace All share editor history', async ({ page }) => {
  await setup(page, 'dark', 1440, 'alpha Alpha alphabet\nalpha');
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  const widget = page.locator('.find-widget');
  const find = page.getByRole('textbox', { name: 'Find', exact: true });
  await find.fill('alpha');
  await widget.getByRole('checkbox', { name: /Match Case/ }).click();
  await widget.getByRole('checkbox', { name: /Match Whole Word/ }).click();
  await widget.getByRole('button', { name: /Next Match/ }).click();
  const next = await page.evaluate(() => window.MarkTideMonaco.getEditor().getSelection().startLineNumber);
  await widget.getByRole('button', { name: /Previous Match/ }).click();
  const previous = await page.evaluate(() => window.MarkTideMonaco.getEditor().getSelection().startLineNumber);
  expect(next).not.toBe(previous);
  const replace = page.getByRole('textbox', { name: 'Replace', exact: true });
  await replace.fill('omega');
  await widget.getByRole('button', { name: /Replace All/ }).click();
  await expect.poll(() => source(page)).toBe('omega Alpha alphabet\nomega');
  await find.press('Escape');
  await page.getByRole('textbox', { name: 'Editor content', exact: true }).focus();
  await page.keyboard.press('Control+z');
  await expect.poll(() => source(page)).toBe('alpha Alpha alphabet\nalpha');
  await page.getByRole('button', { name: 'Find', exact: true }).click();
  await find.fill('alp[a-z]+');
  await widget.getByRole('checkbox', { name: /Use Regular Expression/ }).click();
  await expect(widget.locator('.matchesCount')).toContainText('3');
  await find.fill('not-present');
  await expect(widget.locator('.matchesCount')).toContainText('No results');
  expect(await source(page)).toBe('alpha Alpha alphabet\nalpha');
});

test('multi selections and reverse directions survive formatting and history', async ({ page }) => {
  await setup(page, 'dark', 1081);
  await page.evaluate(() => {
    const editor = window.MarkTideMonaco.getEditor();
    editor.setSelections([new monaco.Selection(1, 6, 1, 1), new monaco.Selection(1, 7, 1, 11)]);
  });
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await expect.poll(() => source(page)).toBe('**alpha** **beta**');
  expect(await page.evaluate(() => window.MarkTideMonaco.getEditor().getSelections().map(selection => selection.getDirection()))).toEqual([1, 0]);
  await page.keyboard.press('Control+z');
  await expect.poll(() => source(page)).toBe('alpha beta');
});

test('all ribbon controls and menus resolve to complete stable command metadata', async ({ page }) => {
  await setup(page, 'light', 1081);
  const inventory = await page.evaluate(() => {
    const registry = window.MarkTideCommands.commands;
    const buttons = [...document.querySelectorAll('.formatting-ribbon [data-editor-command]')];
    return { size: registry.size, ids: buttons.map(button => button.dataset.editorCommand),
      complete: [...registry.values()].every(command => typeof command.execute === 'function' && command.id && command.label),
      hints: buttons.every(button => button.dataset.ribbonTip && button.getAttribute('aria-disabled') !== null
        && !button.hasAttribute('title') && button.getAttribute('aria-label') === registry.get(button.dataset.editorCommand).label) };
  });
  expect(inventory.size).toBe(39);
  expect(new Set(inventory.ids).size).toBe(39);
  expect(inventory.complete).toBe(true);
  expect(inventory.hints).toBe(true);
});

test('read only and preview views disable commands and reinitialization does not duplicate edits', async ({ page }) => {
  await setup(page, 'light', 1440);
  const bold = page.getByRole('button', { name: 'Bold', exact: true });
  await page.evaluate(() => window.MarkTideMonaco.getEditor().updateOptions({ readOnly: true }));
  await expect(bold).toHaveAttribute('aria-disabled', 'true');
  await bold.click({ force: true });
  expect(await source(page)).toBe('alpha beta');
  await page.evaluate(() => {
    window.MarkTideMonaco.getEditor().updateOptions({ readOnly: false });
    window.MarkTideCommands.destroy();
    window.MarkTideCommands.init();
    window.MarkTideCommands.init();
  });
  await expect(bold).toHaveAttribute('aria-disabled', 'false');
  await bold.click();
  await expect.poll(() => source(page)).toBe('**alpha** beta');
  await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
  expect(await page.evaluate(() => window.MarkTideCommands.execute('bold'))).toBe(false);
  expect(await source(page)).toBe('**alpha** beta');
});

test('CRLF models retain their EOL and correct selections when formatting later lines', async ({ page }) => {
  await setup(page, 'dark', 1440, 'first\r\nsecond');
  await page.evaluate(() => {
    const editor = window.MarkTideMonaco.getEditor();
    editor.setSelection(new monaco.Selection(2, 7, 2, 1));
  });
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await expect.poll(() => source(page)).toBe('first\r\n**second**');
  expect(await page.evaluate(() => {
    const editor = window.MarkTideMonaco.getEditor();
    return editor.getModel().getValueInRange(editor.getSelection());
  })).toBe('second');
  await page.keyboard.press('Control+z');
  await expect.poll(() => source(page)).toBe('first\r\nsecond');
});

test('paste handler inserts once and rich conversion rejects executable content', async ({ page }) => {
  await setup(page, 'light', 1440);
  await page.getByRole('textbox', { name: 'Editor content', exact: true }).focus();
  await expect.poll(() => page.evaluate(() => window.MarkTideMonaco.getEditor().hasTextFocus())).toBe(true);
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', 'fallback');
    transfer.setData('text/html', '<p onclick="alert(1)"><strong>Safe</strong><script>alert(1)</script>'
      + '<a href="javascript:alert(1)">label</a><img src="javascript:alert(1)" alt="image"></p>');
    document.activeElement.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }));
  });
  await expect.poll(() => source(page)).toBe('**Safe**labelimage beta');
  await expect(page.locator('#markdown-preview strong')).toHaveText('Safe');
  await expect(page.locator('#markdown-preview script, #markdown-preview a, #markdown-preview img')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect.poll(() => source(page)).toBe('alpha beta');
});

test('stale dialog and clipboard results never edit a changed document', async ({ page }) => {
  await setup(page, 'dark', 1440);
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await page.getByLabel('URL', { exact: true }).fill('https://example.com');
  await page.evaluate(() => window.MarkTideMonaco.getEditor().getModel().setValue('changed document'));
  await page.getByRole('button', { name: 'Insert', exact: true }).click();
  expect(await source(page)).toBe('changed document');
  await expect(page.locator('#editor-command-status')).toContainText('document changed');
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'readText', { configurable: true,
    value: () => new Promise(resolve => { window.resolveClipboard = resolve; }) }));
  await page.getByRole('button', { name: 'Paste options', exact: true }).click();
  await page.getByRole('menuitem', { name: /^Paste without formatting/ }).click();
  await page.evaluate(() => {
    window.MarkTideMonaco.getEditor().getModel().setValue('another document');
    window.resolveClipboard('old clipboard result');
  });
  await expect(page.locator('#editor-command-status')).toContainText('document changed');
  expect(await source(page)).toBe('another document');
});

test('clipboard conversion keeps nested lists simple tables and Word presentation styles', async ({ page }) => {
  await setup(page, 'light', 1440);
  const converted = await page.evaluate(() => window.MarkTideEditorClipboard.convert(
    '<p><span style="font-weight:700;font-style:italic;text-decoration:underline">Office text</span></p>'
    + '<ul><li>Parent<ul><li>Child</li></ul></li></ul>'
    + '<table><tr><th>Head</th><th>Second</th></tr><tr><td>a|b</td><td>line<br>next</td></tr></table>'
    + '<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">1. First</p>'
    + '<p class="MsoListParagraph" style="mso-list:l0 level2 lfo1">2. Child item</p>'));
  expect(converted).toContain('Office text');
  expect(converted).toContain('<u>');
  expect(converted).toContain('**');
  expect(converted).toContain('Child');
  expect(converted).toContain('a\\|b');
  expect(converted).toContain('| Head | Second |');
  expect(converted).not.toContain('mso-list');
  expect(converted).not.toContain('MsoListParagraph');
});

test('disposed clipboard requests cannot resume after command initialization', async ({ page }) => {
  await setup(page, 'light', 1081);
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, 'readText', { configurable: true,
      value: () => new Promise(resolve => { window.resolveDisposedPaste = resolve; }) });
    window.oldPaste = window.MarkTideCommands.execute('paste-plain');
  });
  await page.evaluate(async () => {
    window.MarkTideCommands.destroy();
    window.MarkTideCommands.init();
    window.resolveDisposedPaste('obsolete result');
    await window.oldPaste;
  });
  expect(await source(page)).toBe('alpha beta');
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await expect.poll(() => source(page)).toBe('**alpha** beta');
});

test('line Copy and Cut preserve newline counts at document ends', async ({ page }) => {
  await setup(page, 'light', 1440);
  for (const [text, line, copied, cut] of [['alpha\n', 1, 'alpha\n', ''],
    ['alpha\n', 2, '\n', 'alpha'], ['alpha\nbeta', 2, 'beta\n', 'alpha']]) {
    await page.evaluate(({ text, line }) => {
      const editor = window.MarkTideMonaco.getEditor();
      editor.getModel().setValue(text);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
      Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true,
        value: async text => { window.lineClipboard = text; } });
    }, { text, line });
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    expect(await page.evaluate(() => window.lineClipboard)).toBe(copied);
    expect(await source(page)).toBe(text);
    await page.getByRole('button', { name: 'Cut', exact: true }).click();
    await expect.poll(() => source(page)).toBe(cut);
    await page.keyboard.press('Control+z');
    await expect.poll(() => source(page)).toBe(text);
  }
});

test('format shortcuts ignore key repeats composition and other focused fields', async ({ page }) => {
  await setup(page, 'dark', 1440);
  await page.getByRole('textbox', { name: 'Editor content', exact: true }).focus();
  await expect.poll(() => page.evaluate(() => window.MarkTideMonaco.getEditor().hasTextFocus())).toBe(true);
  await page.keyboard.down('Control');
  await page.keyboard.down('b');
  await expect.poll(() => source(page)).toBe('**alpha** beta');
  await page.keyboard.down('b');
  expect(await source(page)).toBe('**alpha** beta');
  await page.keyboard.up('b');
  await page.keyboard.up('Control');
  await page.evaluate(() => document.activeElement.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
  await page.keyboard.press('Control+i');
  expect(await source(page)).toBe('**alpha** beta');
  await page.evaluate(() => document.activeElement.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  await page.keyboard.press('Control+i');
  await expect.poll(() => source(page)).toBe('***alpha*** beta');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  const field = page.getByLabel('Link text', { exact: true });
  await field.focus();
  await page.keyboard.press('Control+b');
  expect(await source(page)).toBe('***alpha*** beta');
  await page.keyboard.press('Escape');
});

for (const theme of ['light', 'dark']) {
  test('alignment spanning distinct blocks reports mixed in ' + theme, async ({ page }) => {
    const text = ':::marktide-align center\ncentered\n:::\n\nleft';
    await setup(page, theme, 1081, text);
    await page.evaluate(() => {
      const editor = window.MarkTideMonaco.getEditor();
      editor.setSelection(new monaco.Selection(1, 1, 5, 5));
    });
    await expect(page.getByRole('button', { name: 'Align Center', exact: true })).toHaveAttribute('aria-pressed', 'mixed');
    await expect(page.getByRole('button', { name: 'Align Left', exact: true })).toHaveAttribute('aria-pressed', 'mixed');
    await page.getByRole('button', { name: 'Align Right', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Align Right', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Control+z');
    await expect.poll(() => source(page)).toBe(text);
  });
}
for (const theme of ['light', 'dark']) for (const width of [1081, 1920]) {
  test(`alignment buttons toggle to left and switch directly at ${width}px in ${theme}`, async ({ page }) => {
    await setup(page, theme, width);
    const left = page.getByRole('button', { name: 'Align Left', exact: true });
    for (const [name, value] of [['Align Right', 'right'], ['Align Center', 'center'], ['Justify', 'justify']]) {
      const button = page.getByRole('button', { name, exact: true });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#markdown-preview .marktide-aligned-block')).toHaveCSS('text-align', value);
      const aligned = await source(page);
      await button.focus();
      await page.keyboard.press('Space');
      await expect.poll(() => source(page)).toBe('alpha beta');
      await expect(left).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press('Control+z');
      await expect.poll(() => source(page)).toBe(aligned);
      await page.keyboard.press('Control+y');
      await expect.poll(() => source(page)).toBe('alpha beta');
    }
    await page.getByRole('button', { name: 'Align Right', exact: true }).click();
    await page.getByRole('button', { name: 'Align Center', exact: true }).click();
    await expect(page.locator('#markdown-preview .marktide-aligned-block')).toHaveCSS('text-align', 'center');
    expect((await source(page)).match(/:::marktide-align/g)).toHaveLength(1);
    await left.click();
    await left.click();
    await expect.poll(() => source(page)).toBe('alpha beta');
    await expect(left).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Control+e');
    await expect(page.locator('#markdown-preview .marktide-aligned-block')).toHaveCSS('text-align', 'center');
    await page.keyboard.press('Control+e');
    await expect.poll(() => source(page)).toBe('alpha beta');
  });
}

for (const theme of ['light', 'dark']) {
  test('all heading levels and list indentation retain one step history in ' + theme, async ({ page }) => {
    await setup(page, theme, 1081);
    for (let level = 1; level <= 6; level++) {
      await page.getByRole('button', { name: 'Styles', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Heading ' + level, exact: true }).click();
      await expect.poll(() => source(page)).toBe('#'.repeat(level) + ' alpha beta');
      await expect(page.locator('#markdown-preview h' + level)).toHaveText('alpha beta');
      await page.getByRole('button', { name: 'Styles', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Normal', exact: true }).click();
      await expect.poll(() => source(page)).toBe('alpha beta');
      await page.keyboard.press('Control+z');
      await expect.poll(() => source(page)).toBe('#'.repeat(level) + ' alpha beta');
      await page.keyboard.press('Control+z');
      await expect.poll(() => source(page)).toBe('alpha beta');
    }
    await page.evaluate(() => {
      const editor = window.MarkTideMonaco.getEditor();
      editor.getModel().setValue('- parent\n- child');
      editor.setSelection(new monaco.Selection(2, 1, 2, 8));
      editor.focus();
    });
    await page.getByRole('button', { name: 'Increase Indent', exact: true }).click();
    await expect.poll(() => source(page)).toBe('- parent\n  - child');
    await expect(page.locator('#markdown-preview ul ul li')).toHaveText('child');
    await page.getByRole('button', { name: 'Decrease Indent', exact: true }).click();
    await expect.poll(() => source(page)).toBe('- parent\n- child');
    await page.keyboard.press('Control+z');
    await expect.poll(() => source(page)).toBe('- parent\n  - child');
    await page.keyboard.press('Control+z');
    await expect.poll(() => source(page)).toBe('- parent\n- child');
  });

  test('Clear preserves nested code and math through source preview and history in ' + theme, async ({ page }) => {
    const text = '# **Title**\n\nMath $x*y*z$.\n\n> \x60\x60\x60\n> **literal**\n> \x60\x60\x60';
    await setup(page, theme, 1920, text);
    await page.evaluate(() => window.MarkTideMonaco.getEditor().setSelection(new monaco.Selection(1, 1, 7, 6)));
    await page.getByRole('button', { name: 'Clear Formatting', exact: true }).click();
    await expect.poll(() => source(page)).toBe('Title\n\nMath $x*y*z$.\n\n> \x60\x60\x60\n> **literal**\n> \x60\x60\x60');
    await expect(page.locator('#markdown-preview pre code')).toHaveText('**literal**\n');
    await expect(page.locator('#markdown-preview h1')).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect.poll(() => source(page)).toBe(text);
  });
}

