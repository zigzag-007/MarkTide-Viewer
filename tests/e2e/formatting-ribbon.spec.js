const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');
const baseline = process.env.MARKTIDE_RIBBON_BASELINE === '1';
const review = process.env.MARKTIDE_RIBBON_REVIEW_DIR;
const source = '# Workspace notes\n\nA short document for reviewing the editing interface.\n\n'
  + Array.from({ length: 20 }, (_, index) => `## Section ${index + 1}\n\n`
    + 'Keep the content readable while reviewing the tools and navigation. '.repeat(5) + '\n\n').join('');

async function setup(page, theme = 'dark') {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await setTheme(page, theme);
  await renderMarkdown(page, source);
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation =>
      Number.isFinite(animation.effect.getTiming().iterations)).map(animation => animation.finished.catch(() => {})));
  });
}

async function shot(page, name) {
  if (!review) return;
  fs.mkdirSync(review, { recursive: true });
  await page.screenshot({ path: path.join(review, `${baseline ? 'baseline' : 'updated'}-${name}.png`) });
}

async function expectGroupSpacing(page) {
  const geometry = await page.locator('.ribbon-group').evaluateAll(groups => groups.map(group => {
    const bounds = group.getBoundingClientRect();
    const buttons = [...group.querySelectorAll('button')].map(button => button.getBoundingClientRect());
    const divider = getComputedStyle(group, '::after');
    const label = group.querySelector('.ribbon-group-label');
    return {left:Math.min(...buttons.map(button=>button.left))-bounds.left,
      right:bounds.right-Math.max(...buttons.map(button=>button.right)),
      labelY:label.getBoundingClientRect().y,labelSize:getComputedStyle(label).fontSize,
      dividerTop:divider.top,dividerBottom:divider.bottom,dividerWidth:divider.width};
  }));
  for (const group of geometry) {
    expect(group.left).toBeGreaterThanOrEqual(6);
    expect(group.right).toBeGreaterThanOrEqual(6);
    expect(group.labelSize).toBe('11px');
    expect(group.labelY).toBe(geometry[0].labelY);
  }
  for (const group of geometry.slice(0,-1)) {
    expect(parseFloat(group.dividerTop)).toBeGreaterThanOrEqual(5);
    expect(parseFloat(group.dividerBottom)).toBeGreaterThanOrEqual(5);
    expect(group.dividerWidth).toBe('1px');
  }
  expect(geometry[1].left).toBeGreaterThanOrEqual(12);
  expect(geometry[1].right).toBeGreaterThanOrEqual(12);
  expect((await page.getByRole('button',{name:'Styles',exact:true}).boundingBox()).width).toBeGreaterThanOrEqual(84);
  const selected = await page.getByRole('button',{name:'Align Left',exact:true}).boundingBox();
  const next = await page.getByRole('button',{name:'Align Center',exact:true}).boundingBox();
  expect(next.x-(selected.x+selected.width)).toBeGreaterThanOrEqual(2);
  const rows = await page.locator('.ribbon-cut-copy button').evaluateAll(buttons => buttons.map(button => {
    const bounds = button.getBoundingClientRect();
    const icon = button.querySelector('i').getBoundingClientRect();
    const label = button.querySelector('span').getBoundingClientRect();
    return {x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height,
      iconX:icon.x,labelX:label.x,gap:label.left-icon.right,
      centerDifference:Math.abs(icon.y+icon.height/2-label.y-label.height/2)};
  }));
  expect(rows).toHaveLength(2);
  expect(rows[0].x).toBe(rows[1].x);
  expect(rows[1].y).toBe(rows[0].y+rows[0].height);
  expect(rows[0].iconX).toBe(rows[1].iconX);
  expect(rows[0].labelX).toBe(rows[1].labelX);
  for (const row of rows) {
    expect(row.width).toBe(56);
    expect(row.gap).toBe(4);
    expect(row.centerDifference).toBeLessThanOrEqual(1);
  }
  expect(geometry[0].right).toBeGreaterThanOrEqual(8);
  const touch = await page.evaluate(()=>matchMedia('(pointer: coarse)').matches);
  expect(rows[0].height).toBe(touch ? 44 : 30);
}

for (const theme of ['dark', 'light']) for (const [width, height] of [
  [1920, 1080], [1440, 900], [1280, 800], [1194, 834], [1081, 800],
  [1080, 800], [1024, 768], [390, 844], [1440, 540],
]) {
  test(`ribbon layout at ${width}x${height} in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await setup(page, theme);
    await shot(page, `${theme}-${width}x${height}`);
    if (!baseline && width>1080) {
      await page.getByRole('button',{name:'Collapse formatting ribbon',exact:true}).click();
      await expect(page.locator('.formatting-ribbon')).toBeHidden();
      await shot(page, `collapsed-${theme}-${width}x${height}`);
      await page.getByRole('button',{name:'Expand formatting ribbon',exact:true}).click();
      await expect(page.locator('.ribbon-host')).not.toHaveClass(/ribbon-folding/);
    }
    if (baseline) return;
    const eligible = width > 1080;
    await expect(page.locator('.formatting-ribbon')).toBeVisible({ visible: eligible });
    await expect(page.locator('.formatting-toolbar')).toBeHidden();
    await expect(page.locator('#dropzone')).toBeVisible({ visible: !eligible });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (eligible) {
      const bounds = await page.locator('.formatting-ribbon').boundingBox();
      const header = await page.locator('.app-header').boundingBox();
      expect(bounds.x).toBe(0); expect(bounds.width).toBe(width);
      expect(bounds.y).toBeCloseTo(header.y + header.height, 0);
      expect(bounds.height).toBe(94);
      await expectGroupSpacing(page);
      const sizes = await page.locator('.formatting-ribbon').evaluate(ribbon => {
        const size = selector => parseFloat(getComputedStyle(ribbon.querySelector(selector)).fontSize);
        const rows = [...ribbon.querySelectorAll('.ribbon-find-replace button')].map(button => {
          const icon = button.querySelector('i,svg').getBoundingClientRect();
          const label = button.querySelector('span').getBoundingClientRect();
          return {iconX:icon.x,labelX:label.x,gap:label.left-icon.right,
            centerDifference:Math.abs(icon.y+icon.height/2-label.y-label.height/2)};
        });
        return {paste:size('[data-ribbon-command="Paste"] i'),
          small:size('[data-ribbon-command="Find"] i'),
          cut:size('[data-ribbon-command="Cut"] i'),
          copy:size('[data-ribbon-command="Copy"] i'),
          text:size('[data-ribbon-command="Bold"] i'),
          highlight:size('[data-ribbon-command="Highlight"] i'),
          clear:size('[data-ribbon-command="Clear Formatting"] i'),rows};
      });
      expect(sizes.small).toBe(sizes.paste-6);
      expect(sizes.cut).toBeCloseTo(sizes.small*1.03*1.04,2);
      expect(sizes.copy).toBeCloseTo(sizes.small*1.03*1.03,2);
      expect(sizes.text).toBeCloseTo((sizes.paste-2)*1.04,2);
      expect(sizes.highlight).toBeCloseTo((sizes.paste-4)*1.04,2);
      expect(sizes.clear).toBeCloseTo((sizes.paste+2)*1.04*1.04,2);
      expect(sizes.rows[0].iconX).toBe(sizes.rows[1].iconX);
      expect(sizes.rows[0].labelX).toBe(sizes.rows[1].labelX);
      for (const row of sizes.rows) {
        expect(row.gap).toBe(4);
        expect(row.centerDifference).toBeLessThanOrEqual(1);
      }
      await expect(page.locator('.ribbon-scroll,.ribbon-overflow-arrow')).toHaveCount(0);
      expect(await page.locator('.ribbon-groups').evaluate(groups=>groups.getBoundingClientRect().right<=innerWidth+1)).toBe(true);
      const clipped = await page.locator('.ribbon-groups button').evaluateAll(buttons => buttons.some(button=>
        button.scrollWidth>button.clientWidth+1));
      expect(clipped).toBe(false);
      const collision = await page.locator('.ribbon-groups button').evaluateAll(buttons => {
        const rects = buttons.map(button => button.getBoundingClientRect());
        return rects.some((a, i) => rects.some((b, j) => i < j && a.left < b.right - 1
          && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1));
      });
      expect(collision).toBe(false);
      for (const selector of ['.ribbon-clipboard .ribbon-tools > .ribbon-captioned, .ribbon-clipboard .ribbon-paste > .ribbon-captioned','.ribbon-insert button','.ribbon-editing .ribbon-tools > button']) {
        const ys = await page.locator(selector).evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().y));
        expect(new Set(ys).size).toBe(1);
      }
    }
  });
}

for (const theme of ['dark','light']) for (const width of [1081,1440,1920]) test(`balanced artwork and distinct states at ${width}px in ${theme}`, async ({page}) => {
  await page.setViewportSize({width,height:800});
  await setup(page,theme);
  const button = name => page.getByRole('button',{name,exact:true});
  const size = parseFloat(await button('Image').locator('i').evaluate(icon=>getComputedStyle(icon).fontSize));
  for (const name of ['Page Break','Line Break']) await expect(button(name).locator('i')).toHaveCSS('font-size',`${size-2}px`);
  await expect(button('Link').locator('i')).toHaveCSS('font-size',`${size+2}px`);
  await expect(button('Replace').locator('svg')).toHaveAttribute('aria-hidden','true');
  expect(await button('Replace').locator('svg path').getAttribute('d')).toContain('M2 8');
  const state = control => control.evaluate(element=>{
    const css=getComputedStyle(element);
    return {background:css.backgroundColor,shadow:css.boxShadow,outline:css.outlineStyle};
  });
  const selected = button('Align Left');
  const plain = button('Align Center');
  const normal = await state(plain);
  const active = await state(selected);
  expect(active.shadow).not.toBe('none');
  expect(active.background).not.toBe(normal.background);
  await expect(selected).toHaveAttribute('aria-pressed','true');
  await expect(plain).toHaveAttribute('aria-disabled','false');
  await shot(page,`states-normal-${theme}-${width}`);
  await plain.hover();
  expect((await state(plain)).background).not.toBe(normal.background);
  expect((await state(plain)).shadow).toBe(active.shadow);
  await expect.poll(async ()=>(await state(plain)).background).toBe(active.background);
  await expect(page.locator('.ribbon-tooltip')).toContainText('Align Center');
  await shot(page,`states-hover-${theme}-${width}`);
  await selected.hover();
  expect((await state(selected)).shadow).toBe(active.shadow);
  await shot(page,`states-selected-hover-${theme}-${width}`);
  await plain.focus();
  await plain.press('Tab');
  expect(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle)).toBe('solid');
  await shot(page,`states-focus-${theme}-${width}`);
  for (const control of await page.locator('.ribbon-groups button').all()) {
    await control.hover();
    await expect.poll(async ()=>(await state(control)).background).toBe(active.background);
    expect((await state(control)).shadow).toBe(active.shadow);
    await expect(control).toHaveCSS('border-radius','5px');
    expect(await control.evaluate(element=>{
      const button=element.getBoundingClientRect();
      return [...element.querySelectorAll('span,i,svg')].filter(child=>{
        const r=child.getBoundingClientRect();
        return r.left<button.left+2 || r.right>button.right-2 || r.top<button.top+2 || r.bottom>button.bottom-2;
      }).map(child=>`${element.getAttribute('aria-label')}: ${child.tagName}`);
    })).toEqual([]);
  }
  const toggle=page.getByRole('button',{name:'Collapse formatting ribbon',exact:true});
  await toggle.hover();
  await expect.poll(async ()=>(await state(toggle)).background).toBe(active.background);
  expect((await state(toggle)).shadow).toBe(active.shadow);
  await shot(page,`states-chevron-${theme}-${width}`);
  await button('Undo').hover();
  await shot(page,`states-undo-${theme}-${width}`);
  await button('Paste').hover();
  await shot(page,`states-paste-${theme}-${width}`);
});

for (const theme of ['dark','light']) test(`collapse preserves work area and keyboard access in ${theme}`, async ({page}) => {
  test.skip(baseline);
  await page.setViewportSize({width:1081,height:800});
  await setup(page,theme);
  const geometry = () => page.evaluate(() => {
    const bounds = selector => {
      const r=document.querySelector(selector).getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height};
    };
    return {editor:bounds('.editor-pane'),preview:bounds('.preview-pane'),rail:bounds('.marktide-heading-rail')};
  });
  const before=await geometry();
  await page.evaluate(() => {
    const editor=window.MarkTideMonaco.getEditor();
    editor.setSelection(new monaco.Selection(5,3,5,8));
    editor.setScrollTop(200);
    document.querySelector('.preview-pane').scrollTop=200;
  });
  const state = () => page.evaluate(() => {
    const editor=window.MarkTideMonaco.getEditor(); const model=editor.getModel();
    return {selection:JSON.stringify(editor.getSelection()),text:model.getValue(),version:model.getAlternativeVersionId(),
      editorScroll:editor.getScrollTop(),previewScroll:document.querySelector('.preview-pane').scrollTop};
  });
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const documentBefore=await state();
  await page.getByRole('button',{name:'Collapse formatting ribbon',exact:true}).click();
  await expect(page.locator('.formatting-ribbon')).toBeHidden();
  await expect(page.locator('.ribbon-host')).toHaveCSS('height','0px');
  const expand=page.getByRole('button',{name:'Expand formatting ribbon',exact:true});
  await expect(expand).toHaveAttribute('aria-expanded','false');
  await expect(expand).toBeFocused();
  const after=await geometry();
  for (const key of ['editor','preview','rail']) {
    expect(after[key].width).toBe(before[key].width);
    expect(after[key].x).toBe(before[key].x);
    expect(before[key].y-after[key].y).toBeCloseTo(94,0);
  }
  expect(await state()).toEqual(documentBefore);
  await expand.press('Control+b');
  expect((await state()).text).not.toBe(documentBefore.text);
  await page.keyboard.press('Control+z');
  await page.evaluate(() => {
    document.querySelector('.preview-pane').scrollTop = 200;
    window.MarkTideMonaco.getEditor().setScrollTop(200);
  });
  const restored = await state();
  expect(restored.text).toBe(documentBefore.text);
  expect(restored.selection).toBe(documentBefore.selection);
  await expand.focus();
  const button=await expand.boundingBox();
  expect(button.x).toBe(3);
  expect(button.y).toBeGreaterThanOrEqual(after.editor.y);
  expect(button.x+button.width).toBeLessThanOrEqual(50);
  await shot(page,`collapsed-${theme}-1081x800`);
  await expand.press('Tab');
  expect(await page.evaluate(()=>Boolean(document.activeElement.closest('.formatting-ribbon')))).toBe(false);
  await expand.focus();
  await expand.press('Enter');
  await expect(page.locator('.formatting-ribbon')).toBeVisible();
  await expect.poll(geometry).toEqual(before);
  expect(await state()).toEqual(documentBefore);
  await page.getByRole('button',{name:'Collapse formatting ribbon',exact:true}).press('Space');
  await page.setViewportSize({width:1080,height:800});
  await expect(page.locator('.ribbon-host')).toBeHidden();
  await page.setViewportSize({width:1081,height:800});
  await expect(expand).toBeVisible();
  await expect(page.locator('.formatting-ribbon')).toBeHidden();
  await page.locator('#show-code-button').evaluate(button=>button.click());
  await expect(page.locator('.ribbon-host')).toBeHidden();
  await page.locator('#show-code-button').evaluate(button=>button.click());
  await expect(expand).toBeVisible();
  await expand.focus();
  await expand.press('Enter');
  await shot(page,`expanded-${theme}-1081x800`);
});

test('rapid folding and reduced motion settle without stale menus or focus', async ({page}) => {
  await setup(page);
  await page.getByRole('button',{name:'Styles',exact:true}).click();
  await page.getByRole('button',{name:'Collapse formatting ribbon',exact:true}).click();
  await page.getByRole('button',{name:'Expand formatting ribbon',exact:true}).click();
  await expect(page.locator('.ribbon-host')).not.toHaveClass(/ribbon-folding/);
  await expect(page.locator('#ribbon-styles-menu')).toBeHidden();
  await expect(page.locator('.formatting-ribbon')).toHaveAttribute('aria-hidden','false');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Collapse formatting ribbon',exact:true}).click();
  await expect(page.locator('.formatting-ribbon')).toBeHidden();
  expect(await page.locator('.ribbon-host').evaluate(host=>host.getAnimations().length)).toBe(0);
});

for (const theme of ['dark','light']) test(`compact chevron and Undo spacing in ${theme}`, async ({page}) => {
  await page.setViewportSize({width:1081,height:800});
  await setup(page,theme);
  const toggle=page.getByRole('button',{name:'Collapse formatting ribbon',exact:true});
  const undo=page.getByRole('button',{name:'Undo',exact:true});
  const toggleIcon=await toggle.locator('i').boundingBox();
  const undoButton=await undo.boundingBox();
  const undoIcon=await undo.locator('svg').boundingBox();
  const divider=await page.locator('.ribbon-clipboard').evaluate(group=>{
    const style=getComputedStyle(group,'::before');
    const bounds=group.getBoundingClientRect();
    return {width:style.width,top:style.top,bottom:style.bottom,left:style.left,
      pointerEvents:style.pointerEvents,x:bounds.left};
  });
  expect(divider.width).toBe('1px');
  expect(divider.top).toBe('5px');
  expect(divider.bottom).toBe('5px');
  expect(divider.left).toBe('-4px');
  expect(divider.pointerEvents).toBe('none');
  expect(divider.x).toBeGreaterThan(toggleIcon.x+toggleIcon.width);
  expect(divider.x).toBeLessThan(undoIcon.x);
  expect(undoButton.width).toBe(36);
  expect(undoIcon.width).toBeCloseTo(19.4,1);
  expect(undoIcon.x+undoIcon.width/2).toBeCloseTo(undoButton.x+undoButton.width/2,1);
  expect(undoButton.x).toBeGreaterThanOrEqual((await toggle.boundingBox()).x+(await toggle.boundingBox()).width);
  await toggle.click();
  await expect(page.locator('.formatting-ribbon')).toBeHidden();
  const collapsedIcon=await page.getByRole('button',{name:'Expand formatting ribbon',exact:true}).locator('i').boundingBox();
  expect(collapsedIcon.x).toBe(toggleIcon.x);
});

for (const theme of ['dark','light']) test(`icon sizes follow available viewport width in ${theme}`, async ({page}) => {
  await setup(page,theme);
  for (const [width,size] of [[1081,20],[1279,20],[1280,21],[1439,21],[1440,22],[1920,22]]) {
    await page.setViewportSize({width,height:800});
    await expect.poll(()=>page.locator('.formatting-ribbon').evaluate(ribbon=>ribbon.style.getPropertyValue('--ribbon-width'))).toBe(`${width}px`);
    expect(parseFloat(await page.getByRole('button',{name:'Bold',exact:true}).locator('i').evaluate(icon=>getComputedStyle(icon).fontSize))).toBeCloseTo((size-2)*1.04,2);
    expect(parseFloat(await page.getByRole('button',{name:'Highlight',exact:true}).locator('i').evaluate(icon=>getComputedStyle(icon).fontSize))).toBeCloseTo((size-4)*1.04,2);
    expect((await page.getByRole('button',{name:'Undo',exact:true}).locator('svg').boundingBox()).width).toBeCloseTo(size*.97,1);
    expect(await page.locator('.ribbon-groups').evaluate(groups=>groups.getBoundingClientRect().right<=innerWidth)).toBe(true);
    await shot(page,`icon-width-${theme}-${width}`);
  }
  await page.setViewportSize({width:1440,height:800});
  const widths=await page.locator('.ribbon-group').evaluateAll(groups=>groups.map(group=>group.getBoundingClientRect().width));
  await page.setViewportSize({width:1920,height:800});
  expect(await page.locator('.ribbon-group').evaluateAll(groups=>groups.map(group=>group.getBoundingClientRect().width))).toEqual(widths);
});

test('folding moves editor, preview and rail together during the transition', async ({page}) => {
  await setup(page);
  await page.getByRole('button',{name:'Collapse formatting ribbon',exact:true}).click();
  await expect(page.locator('.formatting-ribbon')).toBeHidden();
  await page.locator('.ribbon-host').evaluate(host => {
    const animate=host.animate;
    host.animate=function (...args) {
      const animation=animate.apply(this,args);
      animation.pause();
      return animation;
    };
  });
  await page.getByRole('button',{name:'Expand formatting ribbon',exact:true}).click();
  const samples = await page.evaluate(async () => {
    const host=document.querySelector('.ribbon-host');
    const animation=host.getAnimations()[0];
    if (!animation) return [];
    animation.pause();
    const result=[];
    for (const time of [0,60,120,180]) {
      animation.currentTime=time;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const top=selector=>document.querySelector(selector).getBoundingClientRect().top;
      result.push({height:host.getBoundingClientRect().height,editor:top('.editor-pane'),
        preview:top('.preview-pane'),rail:top('.marktide-heading-rail')});
    }
    animation.play();
    delete host.animate;
    return result;
  });
  expect(samples).toHaveLength(4);
  for (const sample of samples) {
    expect(sample.editor).toBeCloseTo(sample.preview,0);
    expect(sample.rail).toBeCloseTo(sample.preview,0);
  }
  expect(samples[0].height).toBe(0);
  expect(samples[1].height).toBeGreaterThan(0);
  expect(samples[1].height).toBeLessThan(94);
  expect(samples[3].height).toBe(94);
  await expect(page.locator('.ribbon-host')).not.toHaveClass(/ribbon-folding/);
});

test.describe('long editor gutter', () => {
  test.use({hasTouch:true,isMobile:true});
  test('collapsed control leaves four digit line numbers clear', async ({page}) => {
    await page.setViewportSize({width:1081,height:834});
    await setup(page);
    await renderMarkdown(page, '# Long notes\n' + 'A short line.\n'.repeat(1100));
    await page.evaluate(() => window.MarkTideMonaco.getEditor().revealLineNearTop(1000));
    await page.getByRole('button',{name:'Collapse formatting ribbon',exact:true}).tap();
    await expect(page.locator('.formatting-ribbon')).toBeHidden();
    const control=await page.getByRole('button',{name:'Expand formatting ribbon',exact:true}).boundingBox();
    const numbers=await page.locator('.monaco-editor .line-numbers').evaluateAll(elements => elements.map(element => {
      const range=document.createRange();range.selectNodeContents(element);
      const r=range.getBoundingClientRect();
      return {text:element.textContent,left:r.left,top:r.top,right:r.right,bottom:r.bottom};
    }));
    const overlapping=numbers.filter(number=>number.left<control.x+control.width && number.right>control.x
      && number.top<control.y+control.height && number.bottom>control.y);
    expect(numbers.some(number=>Number(number.text)>=1000)).toBe(true);
    expect(overlapping).toEqual([]);
    await shot(page,'collapsed-long-gutter-touch');
    await renderMarkdown(page, source);
    await expect.poll(()=>page.getByRole('button',{name:'Expand formatting ribbon',exact:true})
      .evaluate(button=>button.getBoundingClientRect().width)).toBe(40);
    await page.getByRole('button',{name:'Expand formatting ribbon',exact:true}).tap();
    await expect(page.locator('.formatting-ribbon')).toBeVisible();
    await expect.poll(()=>page.locator('.content-container').evaluate(content=>content.style
      .getPropertyValue('--ribbon-number-offset'))).toBe('');
  });
});

test('six groups contain exactly the approved controls and row arrangements', async ({ page }) => {
  test.skip(baseline);
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  expect(await page.locator('.ribbon-group').evaluateAll(groups => groups.map(group => group.getAttribute('aria-label'))))
    .toEqual(['Clipboard', 'Styles', 'Text', 'Paragraph', 'Insert', 'Editing']);
  const expected = {
    Clipboard: ['Undo', 'Redo', 'Paste', 'Paste options', 'Cut', 'Copy'],
    Styles: ['Styles'],
    Text: ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Highlight', 'Inline Code'],
    Paragraph: ['Bullet List', 'Numbered List', 'Task List', 'Blockquote', 'Page Break', 'Line Break',
      'Align Left', 'Align Center', 'Align Right', 'Justify', 'Decrease Indent', 'Increase Indent'],
    Insert: ['Link', 'Image', 'Code Block', 'Table'], Editing: ['Find', 'Replace', 'Clear Formatting'],
  };
  for (const [name, labels] of Object.entries(expected)) {
    expect(await page.getByRole('group', {name, exact:true}).locator('button').evaluateAll(buttons =>
      buttons.map(button => button.getAttribute('aria-label')))).toEqual(labels);
  }
  expect(await page.locator('.ribbon-command').count()).toBe(30);
  expect(await page.locator('.ribbon-command').evaluateAll(buttons => buttons.every(button =>
    button.dataset.editorCommand && !button.matches('[data-format], .format-button, [id^="format-"]')))).toBe(true);
  await expect(page.getByRole('button', {name:'Table',exact:true})).toHaveAttribute('aria-haspopup', 'dialog');
  expect(await page.getByRole('button', {name:'Table',exact:true}).locator('i').count()).toBe(1);
  expect(await page.locator('.ribbon-insert .ribbon-captioned span').allTextContents()).toEqual(['Link','Image','Code','Table']);
  expect(await page.locator('.ribbon-paste .bi-chevron-down').count()).toBe(1);
  for (const [selector, columns] of [['.ribbon-text-grid', 3], ['.ribbon-paragraph-grid', 6]]) {
    const rects = await page.locator(`${selector} button`).evaluateAll(buttons => buttons.map(button => {
      const r = button.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};
    }));
    for (let i = 0; i < columns; i++) {
      expect(rects[i].y).toBe(rects[0].y);
      expect(rects[i + columns].y).toBe(rects[columns].y);
      expect(rects[i].x).toBe(rects[i + columns].x);
      expect(rects[i + columns].y).toBeGreaterThanOrEqual(rects[i].y + rects[i].height);
    }
  }
  await expect(page.getByRole('button', {name:'Page Break',exact:true}).locator('i')).toHaveClass(/bi-file-break/);
  await expect(page.getByRole('button', {name:'Line Break',exact:true}).locator('i')).toHaveClass(/bi-arrow-return-left/);
  await expect(page.getByRole('button', {name:'Align Left',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.ribbon-phase-note')).toHaveCount(0);
  await expect(page.locator('#ribbon-phase-help')).toContainText('retained editor selection');
  await expect(page.getByRole('button',{name:'Align Left',exact:true})).toHaveAccessibleDescription(/retained editor selection/);
  for (const name of ['Undo','Redo']) {
    const command = page.getByRole('button',{name,exact:true});
    await expect(command.locator('svg')).toHaveCount(1);
    await expect(command.locator('i')).toHaveCount(0);
    expect((await command.locator('svg').boundingBox()).width).toBeCloseTo(22*.97,1);
  }
  await expect(page.getByRole('button',{name:'Highlight',exact:true}).locator('i')).toHaveCSS('font-size','18.72px');
  await expect(page.getByRole('button',{name:'Bold',exact:true}).locator('i')).toHaveCSS('font-size','20.8px');
  expect((await page.getByRole('button',{name:'Highlight',exact:true}).boundingBox()).width)
    .toBe((await page.getByRole('button',{name:'Bold',exact:true}).boundingBox()).width);
});

for (const theme of ['light', 'dark']) {
  test(`menu keyboard, focus, tooltip and dismissal in ${theme}`, async ({ page }) => {
    test.skip(baseline);
    await page.setViewportSize({width:1440,height:540});
    await setup(page, theme);
    for (const [name, id, labels] of [['Paste options','ribbon-paste-menu',['Paste with formatting','Paste without formatting']],
      ['Styles','ribbon-styles-menu',['Normal','Heading 1','Heading 2','Heading 3','Heading 4','Heading 5','Heading 6']]]) {
      const trigger = page.getByRole('button',{name,exact:true});
      await trigger.focus();
      await expect(page.locator('.ribbon-tooltip')).toBeVisible();
      const focus = await trigger.evaluate(button => getComputedStyle(button).outlineStyle);
      expect(focus).toBe('solid');
      await trigger.press('ArrowDown');
      await expect(trigger).toHaveAttribute('aria-expanded','true');
      const menu = page.locator(`#${id}`);
      expect(await menu.getByRole('menuitem').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')))).toEqual(labels);
      expect(await menu.getByRole('menuitem').evaluateAll(buttons => buttons.every(button => button.dataset.editorCommand && button.getAttribute('aria-disabled') === 'false'))).toBe(true);
      await expect(menu.getByRole('menuitem').first()).toBeFocused();
      await menu.getByRole('menuitem').first().press('End');
      await expect(menu.getByRole('menuitem').last()).toBeFocused();
      await menu.getByRole('menuitem').last().press('ArrowDown');
      await expect(menu.getByRole('menuitem').first()).toBeFocused();
      await menu.getByRole('menuitem').first().press('ArrowUp');
      await expect(menu.getByRole('menuitem').last()).toBeFocused();
      await menu.getByRole('menuitem').last().press('Home');
      await expect(menu.getByRole('menuitem').first()).toBeFocused();
      const bounds = await menu.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(1440);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(540);
      await shot(page, `menu-${id}-${theme}`);
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden(); await expect(trigger).toBeFocused();
      await trigger.click(); await trigger.click(); await expect(menu).toBeHidden();
      await trigger.click(); await page.locator('.app-header').click(); await expect(menu).toBeHidden();
      await trigger.press('ArrowUp'); await expect(menu.getByRole('menuitem').last()).toBeFocused();
      await page.keyboard.press('Tab'); await expect(menu).toBeHidden();
    }
  });
}

test('read only command controls and menu entries preserve source and history', async ({ page }) => {
  test.skip(baseline);
  await page.setViewportSize({width:1920,height:1080});
  await setup(page);
  await page.evaluate(() => window.MarkTideMonaco.getEditor().updateOptions({readOnly:true}));
  await expect(page.getByRole('button',{name:'Bold',exact:true})).toHaveAttribute('aria-disabled','true');
  const snapshot = () => page.evaluate(() => {
    const editor = window.MarkTideMonaco.getEditor(); const model = editor.getModel();
    return {text:model.getValue(),selection:JSON.stringify(editor.getSelection()),
      version:model.getAlternativeVersionId(),canUndo:model.canUndo(),canRedo:model.canRedo()};
  });
  const before = await snapshot();
  for (const command of await page.locator('.ribbon-command[aria-disabled="true"]').all()) {
    await command.click({force:true});
    expect(await snapshot()).toEqual(before);
  }
  for (const id of ['ribbon-paste-menu','ribbon-styles-menu']) {
    await page.locator('[aria-controls="' + id + '"]').click();
    for (const entry of await page.locator('#' + id + ' button').all()) {
      await expect(entry).toHaveAttribute('aria-disabled','true');
      await entry.click({force:true});
      expect(await snapshot()).toEqual(before);
    }
    await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('button',{name:'Find',exact:true})).toHaveAttribute('aria-disabled','false');
  await expect(page.getByRole('button',{name:'Copy',exact:true})).toHaveAttribute('aria-disabled','false');
});

for (const theme of ['light', 'dark']) {
  test(`keyboard order reaches every compact control in ${theme}`, async ({page}) => {
    test.skip(baseline);
    await page.setViewportSize({width:1081,height:800});
    await setup(page,theme);
    const before = await page.locator('#markdown-editor').evaluate(editor=>editor.value);
    const labels = await page.locator('.ribbon-groups button').evaluateAll(buttons => buttons.map(button=>button.getAttribute('aria-label')));
    await page.locator('.ribbon-command').first().focus();
    for (const label of labels) {
      expect(await page.evaluate(()=>document.activeElement.getAttribute('aria-label'))).toBe(label);
      const visible = await page.evaluate(() => {
        const button=document.activeElement.getBoundingClientRect();
        return button.left >= -1 && button.right <= innerWidth+1;
      });
      expect(visible,`${label} must be fully visible when focused`).toBe(true);
      if (label !== labels.at(-1)) await page.keyboard.press('Tab');
    }
    for (const label of [...labels].reverse()) {
      expect(await page.evaluate(()=>document.activeElement.getAttribute('aria-label'))).toBe(label);
      if (label !== labels[0]) await page.keyboard.press('Shift+Tab');
    }
    await page.getByRole('button',{name:'Clear Formatting',exact:true}).focus();
    await page.keyboard.press('Control+b');
    expect(await page.locator('#markdown-editor').evaluate(editor=>editor.value)).not.toBe(before);
    await page.keyboard.press('Control+z');
    await shot(page,`keyboard-compact-${theme}`);
    expect(await page.locator('#markdown-editor').evaluate(editor=>editor.value)).toBe(before);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(()=>document.activeElement.closest('.formatting-ribbon'))).toBeNull();
  });

  test(`labels, icons and focus remain readable in ${theme}`, async ({page}) => {
    test.skip(baseline);
    await page.setViewportSize({width:1440,height:900});
    await setup(page,theme);
    const styles = page.getByRole('button',{name:'Styles',exact:true});
    await styles.press('ArrowDown');
    const contrasts = await page.evaluate(() => {
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
      const ctx=canvas.getContext('2d');
      const luminance = color => {
        ctx.fillStyle=color;ctx.fillRect(0,0,1,1);
        const [r,g,b]=ctx.getImageData(0,0,1,1).data;
        const linear=[r,g,b].map(value=>value/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
        return linear[0]*0.2126+linear[1]*0.7152+linear[2]*0.0722;
      };
      const ratio=(a,b)=>(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
      const root=getComputedStyle(document.querySelector('.formatting-ribbon'));
      const backgrounds=[luminance(root.backgroundColor)];
      const text=[...document.querySelectorAll('.ribbon-group-label,.ribbon-captioned span')]
        .map(element=>Math.min(...backgrounds.map(background=>ratio(luminance(getComputedStyle(element).color),background))));
      const icons=[...document.querySelectorAll('.ribbon-command i,.ribbon-command svg')]
        .map(element=>Math.min(...backgrounds.map(background=>ratio(luminance(getComputedStyle(element).color),background))));
      const menu=document.querySelector('#ribbon-styles-menu'); const menuBackground=luminance(getComputedStyle(menu).backgroundColor);
      const entries=[...menu.querySelectorAll('button,button span')].map(element=>ratio(luminance(getComputedStyle(element).color),menuBackground));
      const focus=ratio(luminance(getComputedStyle(document.activeElement).outlineColor),menuBackground);
      return {text:Math.min(...text),icons:Math.min(...icons),entries:Math.min(...entries),focus};
    });
    expect(contrasts.text).toBeGreaterThanOrEqual(4.5);
    expect(contrasts.entries).toBeGreaterThanOrEqual(4.5);
    expect(contrasts.icons).toBeGreaterThanOrEqual(3);
    expect(contrasts.focus).toBeGreaterThanOrEqual(3);
    await page.keyboard.press('Escape');
    const bold=page.getByRole('button',{name:'Bold',exact:true});
    await bold.hover();
    await expect(bold).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');
    await expect(page.locator('.ribbon-tooltip')).toContainText('Bold');
    await shot(page,`hover-${theme}`);
    await page.getByRole('button',{name:'Align Left',exact:true}).hover();
    await expect(page.locator('.ribbon-tooltip')).toContainText('Align Left');
    await shot(page,`hover-selected-${theme}`);
  });
}

test('mode changes, resizing and rerenders never leave duplicate ribbons or stale menus', async ({ page }) => {
  test.skip(baseline);
  await page.setViewportSize({width:1440,height:900});
  await setup(page);
  for (let count=0;count<3;count++) {
    await page.evaluate(() => window.MarkTideRibbon.init());
    await page.getByRole('button',{name:'Styles',exact:true}).click();
    await expect(page.locator('#ribbon-styles-menu')).toBeVisible();
    await page.locator('#show-code-button').click();
    await expect(page.locator('.formatting-ribbon')).toBeHidden();
    await expect(page.locator('#ribbon-styles-menu')).toBeHidden();
    await page.locator('#show-code-button').click();
    await expect(page.locator('.formatting-ribbon')).toBeVisible();
    await page.locator('#show-preview-button').click();
    await expect(page.locator('.formatting-ribbon')).toBeVisible();
    await page.locator('#show-preview-button').click();
    await page.getByRole('button',{name:'Styles',exact:true}).click();
    await page.setViewportSize({width:1080,height:800});
    await expect(page.locator('.formatting-ribbon')).toBeHidden();
    await expect(page.locator('#ribbon-styles-menu')).toBeHidden();
    await expect(page.locator('#dropzone')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement.closest('.formatting-ribbon') !== null)).toBe(false);
    await page.setViewportSize({width:1081,height:800});
    await expect(page.locator('.formatting-ribbon')).toBeVisible();
    await renderMarkdown(page, source);
    await expect(page.locator('.formatting-ribbon')).toHaveCount(1);
    await page.setViewportSize({width:1440,height:900});
  }
  const editing = await page.locator('.ribbon-editing').evaluate(group => {
    const rect = element => { const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}; };
    const rows=[...group.querySelectorAll('.ribbon-find-replace button')].map(button=>({button:rect(button),
      icon:rect(button.querySelector('i,svg')),label:rect(button.querySelector('span'))}));
    return {rows,clear:rect(group.querySelector('.ribbon-tools > button')),
      clearIcon:rect(group.querySelector('.ribbon-tools > button i')),
      clearLabel:rect(group.querySelector('.ribbon-tools > button span')),
      group:rect(group),label:rect(group.querySelector('.ribbon-group-label'))};
  });
  expect(editing.rows).toHaveLength(2);
  expect(editing.rows[0].button.x).toBe(editing.rows[1].button.x);
  expect(editing.rows[1].button.y).toBe(editing.rows[0].button.y+editing.rows[0].button.height);
  expect(editing.rows[0].label.x).toBe(editing.rows[1].label.x);
  for (const row of editing.rows) {
    expect(row.label.x).toBeGreaterThan(row.icon.x+row.icon.width);
    expect(Math.abs(row.icon.y+row.icon.height/2-row.label.y-row.label.height/2)).toBeLessThan(1);
  }
  expect(editing.clear.x).toBeGreaterThanOrEqual(editing.rows[0].button.x+editing.rows[0].button.width);
  expect(editing.clearLabel.y).toBeGreaterThan(editing.clearIcon.y+editing.clearIcon.height);
  expect(editing.label.x+editing.label.width/2).toBe(editing.group.x+editing.group.width/2);
});

test.describe('eligible touch tablet', () => {
  test.use({hasTouch:true,isMobile:true});
  for (const theme of ['dark','light']) test(`touch folding keeps the gutter and pinned TOC clear in ${theme}`, async ({page}) => {
    await page.setViewportSize({width:1081,height:834});
    await setup(page,theme);
    await page.locator('.marktide-heading-marker').first().tap();
    await page.getByRole('button',{name:'Pin table of contents',exact:true}).tap();
    const readingWidth=await page.locator('#markdown-preview').evaluate(root=>root.clientWidth);
    const collapse=page.getByRole('button',{name:'Collapse formatting ribbon',exact:true});
    const before=await collapse.boundingBox();
    expect(before.width).toBeGreaterThanOrEqual(40);
    expect(before.height).toBeGreaterThanOrEqual(44);
    await collapse.tap();
    await expect(page.locator('.formatting-ribbon')).toBeHidden();
    const expand=page.getByRole('button',{name:'Expand formatting ribbon',exact:true});
    const control=await expand.boundingBox();
    const numberLeft=await page.locator('.monaco-editor .line-numbers').first().evaluate(number=>{
      const range=document.createRange();range.selectNodeContents(number);
      return range.getBoundingClientRect().left;
    });
    expect(control.x).toBe(3);
    expect(control.x+control.width).toBeLessThanOrEqual(numberLeft);
    await expect(page.locator('.marktide-toc')).toBeVisible();
    const panel=await page.locator('.marktide-toc').boundingBox();
    const pane=await page.locator('.preview-pane').boundingBox();
    expect(panel.y).toBeCloseTo(pane.y,0);
    expect(await page.locator('#markdown-preview').evaluate(root=>root.clientWidth)).toBe(readingWidth);
    await shot(page,`collapsed-touch-pinned-${theme}`);
    await expand.tap();
    await expect(page.locator('.ribbon-host')).not.toHaveClass(/ribbon-folding/);
    await page.getByRole('button',{name:'Unpin table of contents',exact:true}).tap();
    await shot(page,`expanded-touch-floating-${theme}`);
  });
  for (const theme of ['light','dark']) test(`short touch viewport keeps menus and TOC clear in ${theme}`, async ({page}) => {
    test.skip(baseline);
    await page.setViewportSize({width:1081,height:540});
    await setup(page,theme);
    await expectGroupSpacing(page);
    for (const name of ['Paste options','Styles']) {
      const trigger = page.getByRole('button',{name,exact:true});
      await trigger.tap();
      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      const bounds = await menu.boundingBox();
      expect(bounds.y).toBeGreaterThanOrEqual(8);
      expect(bounds.y+bounds.height).toBeLessThanOrEqual(532);
      await menu.getByRole('menuitem').first().press('End');
      const last = menu.getByRole('menuitem').last();
      await expect(last).toBeFocused();
      const entry = await last.boundingBox();
      expect(entry.y+entry.height).toBeLessThanOrEqual(bounds.y+bounds.height);
      expect(await menu.evaluate(element => {
        const menuBounds = element.getBoundingClientRect();
        const railBounds = document.querySelector('.marktide-heading-rail').getBoundingClientRect();
        const left = Math.max(menuBounds.left+2,railBounds.left);
        const right = Math.min(menuBounds.right-2,railBounds.right);
        if (left>=right) return true;
        const y = Math.max(menuBounds.top+2,railBounds.top)+12;
        return element.contains(document.elementFromPoint((left+right)/2,y));
      })).toBe(true);
      await shot(page,`short-touch-${name.toLowerCase().replaceAll(' ','-')}-${theme}`);
      await last.press('Escape');
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
    }
    await page.locator('.marktide-heading-marker').first().tap();
    await expect(page.locator('.marktide-toc')).toBeVisible();
    const panel = await page.locator('.marktide-toc').boundingBox();
    const ribbon = await page.locator('.formatting-ribbon').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(ribbon.y+ribbon.height);
    expect(panel.y+panel.height).toBeLessThanOrEqual(540);
    await shot(page,`short-touch-toc-${theme}`);
  });
  for (const width of [1081,1194]) for (const theme of ['light','dark']) test(`menus and compact touch targets fit at ${width}px in ${theme}`, async ({page}) => {
    await page.setViewportSize({width,height:834});
    await setup(page,theme);
    if (baseline) { await shot(page,`touch-tablet-fit-${width}-${theme}`); return; }
    await shot(page,`touch-tablet-fit-${width}-${theme}`);
    expect((await page.locator('.formatting-ribbon').boundingBox()).height).toBe(114);
    await expectGroupSpacing(page);
    const targets = await page.locator('.ribbon-groups button').evaluateAll(buttons => buttons.map(button => {
      const r=button.getBoundingClientRect();return {width:r.width,height:r.height};
    }));
    expect(targets.every(target=>target.width>=40 && target.height>=44)).toBe(true);
    await page.getByRole('button',{name:'Styles',exact:true}).tap();
    await expect(page.locator('#ribbon-styles-menu')).toBeVisible();
    await page.locator('.app-header').tap(); await expect(page.locator('#ribbon-styles-menu')).toBeHidden();
    expect(await page.locator('.ribbon-groups').evaluate(groups=>groups.getBoundingClientRect().right<=innerWidth+1)).toBe(true);
    await page.getByRole('button',{name:'Clear Formatting',exact:true}).tap({force:true});
    await shot(page,`touch-tablet-fit-${width}-${theme}`);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const readingWidth = await page.locator('#markdown-preview').evaluate(element=>element.clientWidth);
    const editorWidth = await page.locator('.editor-pane').evaluate(element=>element.clientWidth);
    await page.locator('.marktide-heading-marker').first().tap();
    await expect(page.locator('.marktide-toc')).toBeVisible();
    expect(await page.locator('#markdown-preview').evaluate(element=>element.clientWidth)).toBe(readingWidth);
    const panel = await page.locator('.marktide-toc').boundingBox();
    const ribbon = await page.locator('.formatting-ribbon').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(ribbon.y+ribbon.height);
    expect(panel.y+panel.height).toBeLessThanOrEqual(834);
    await shot(page,`touch-tablet-toc-floating-${width}-${theme}`);
    await page.getByRole('button',{name:'Pin table of contents',exact:true}).tap();
    await expect.poll(()=>page.locator('#markdown-preview').evaluate(element=>element.clientWidth)).toBeLessThan(readingWidth-200);
    expect(await page.locator('.editor-pane').evaluate(element=>element.clientWidth)).toBe(editorWidth);
    await shot(page,`touch-tablet-toc-pinned-${width}-${theme}`);
  });
});

test.describe('natural fitting measurements', () => {
  test.use({hasTouch:true,isMobile:true});
  for (const theme of ['dark','light']) test(`measure natural touch width in ${theme}`, async ({page}) => {
    test.skip(baseline);
    await setup(page,theme);
    const measurements=[];
    for (const width of [1081,1120,1194,1240,1280,1370,1440]) {
      await page.setViewportSize({width,height:834});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await expectGroupSpacing(page);
      measurements.push(await page.locator('.ribbon-groups').evaluate(groups=>({
        viewport:innerWidth,requiredWidth:groups.getBoundingClientRect().width,
        fits:groups.getBoundingClientRect().right<=innerWidth+1,
        height:document.querySelector('.formatting-ribbon').getBoundingClientRect().height,
        targets:[...groups.querySelectorAll('button')].map(button=>({label:button.getAttribute('aria-label'),
          width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height}))
      })));
      await shot(page,`natural-touch-${theme}-${width}`);
    }
    if (review) fs.writeFileSync(path.join(review,`natural-touch-${theme}.json`),JSON.stringify(measurements,null,2));
    for (const measurement of measurements) {
      expect(measurement.targets.every(target=>target.width>=40 && target.height>=44)).toBe(true);
      expect(measurement.fits).toBe(true);
    }
    console.log(JSON.stringify(measurements.map(({viewport,requiredWidth,fits,height})=>({viewport,requiredWidth,fits,height}))));
  });
});

test('wide screens keep natural group sizes and a separate theme surface', async ({page}) => {
  test.skip(baseline);
  await page.setViewportSize({width:1440,height:900});
  await setup(page);
  const widths = () => page.locator('.ribbon-group').evaluateAll(groups=>groups.map(group=>group.getBoundingClientRect().width));
  await expect.poll(()=>page.locator('.formatting-ribbon').evaluate(ribbon=>ribbon.style.getPropertyValue('--ribbon-width'))).toBe('1440px');
  const normal = await widths();
  await page.setViewportSize({width:1920,height:1080});
  expect(await widths()).toEqual(normal);
  const groups = await page.locator('.ribbon-groups').boundingBox();
  expect(groups.x).toBe(0);
  expect(groups.width).toBeLessThan(1400);
  // A future floating surface can be narrower than the browser window.
  await page.locator('.formatting-ribbon').evaluate(ribbon=>{ribbon.style.width='1081px';});
  await expect.poll(()=>page.locator('.ribbon-groups').evaluate(groups=>groups.getBoundingClientRect().right<=1082)).toBe(true);
  await page.locator('.formatting-ribbon').evaluate(ribbon=>{ribbon.style.removeProperty('width');});
  await expect.poll(widths).toEqual(normal);
  for (const theme of ['dark','light']) {
    await setTheme(page,theme);
    await expect.poll(()=>page.locator('.formatting-ribbon').evaluate(ribbon=>{
      const css=getComputedStyle(ribbon);
      return css.backgroundImage==='none' && css.backgroundColor===getComputedStyle(document.querySelector('.editor-pane')).backgroundColor;
    })).toBe(true);
    await shot(page,`natural-width-${theme}`);
  }
});

test('narrow interface, native shortcuts and existing toolbar bindings remain intact', async ({page}) => {
  test.skip(baseline);
  await page.setViewportSize({width:1024,height:768});
  await setup(page);
  await expect(page.locator('#dropzone')).toBeVisible();
  await expect(page.locator('.formatting-ribbon')).toBeHidden();
  await page.evaluate(() => {
    const editor=window.MarkTideMonaco.getEditor();editor.getModel().setValue('alpha');
    editor.setSelection(new monaco.Selection(1,1,1,6));editor.focus();
  });
  await page.keyboard.press('Control+b');
  await expect.poll(()=>page.locator('#markdown-editor').evaluate(editor=>editor.value)).toBe('**alpha**');
  await page.keyboard.press('Control+z');
  await expect.poll(()=>page.locator('#markdown-editor').evaluate(editor=>editor.value)).toBe('alpha');
  // These controls are already hidden in the current narrow layout.
  await page.locator('#format-bold').evaluate(button=>button.click());
  await expect.poll(()=>page.locator('#markdown-editor').evaluate(editor=>editor.value)).toBe('**alpha**');
});

test('file browsing and editor drag/drop remain available without the large field', async ({page}) => {
  test.skip(baseline);
  await page.setViewportSize({width:1440,height:900});
  await setup(page);
  page.on('dialog', dialog => dialog.accept());
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Open Markdown file',exact:true}).click();
  const selected = await chooser;
  expect(selected.isMultiple()).toBe(false);
  await page.locator('#file-input').setInputFiles({name:'notes.md',mimeType:'text/markdown',buffer:Buffer.from('# Opened file')});
  await expect.poll(()=>page.locator('#markdown-editor').evaluate(editor=>editor.value)).toContain('# Opened file');
  await page.evaluate(() => {
    const transfer=new DataTransfer();transfer.items.add(new File(['# Dropped file'], 'dropped.md',{type:'text/markdown'}));
    document.querySelector('.editor-pane').dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:transfer}));
  });
  await expect.poll(()=>page.locator('#markdown-editor').evaluate(editor=>editor.value)).toContain('# Dropped file');
});

async function expectNoRibbonMarkup(page, html) {
  const markup = await page.evaluate(source => {
    const document = new DOMParser().parseFromString(source, 'text/html');
    document.querySelectorAll('script').forEach(script => script.remove());
    return document.documentElement.outerHTML;
  }, html);
  expect(markup).not.toMatch(/formatting-ribbon|ribbon-command|ribbon-styles-menu|ribbon-phase-help|ribbon-host|ribbon-toggle/);
}

test('ribbon UI never enters fresh HTML or PDF documents', async ({page,context,baseURL}) => {
  test.skip(baseline);
  await installStandaloneCdnMirror(context);
  await page.setViewportSize({width:1440,height:900});
  await setup(page);
  const html=await captureHtmlExport(page);
  await expectNoRibbonMarkup(page, html);
  const exported=await context.newPage();
  await exported.setContent(html.replace('<head>',`<head><base href="${baseURL}/">`));
  await expect(exported.locator('h1')).toHaveText('Workspace notes');
  await expect(exported.locator('.formatting-ribbon')).toHaveCount(0);
  await exported.close();
  const pdf=await capturePdfPreparation(page,'Ribbon isolation',{includeDocumentHtml:true});
  await expectNoRibbonMarkup(page, pdf.documentHtml);
  await page.getByRole('button',{name:'Collapse formatting ribbon',exact:true}).click();
  await expect(page.locator('.formatting-ribbon')).toBeHidden();
  await expectNoRibbonMarkup(page, await captureHtmlExport(page));
  const collapsedPdf=await capturePdfPreparation(page,'Collapsed ribbon isolation',{includeDocumentHtml:true});
  await expectNoRibbonMarkup(page, collapsedPdf.documentHtml);
});

test.describe('fullscreen on a larger screen', () => {
  test.use({viewport:{width:1440,height:900},contextOptions:{screen:{width:1920,height:1080}}});
  test('reduced motion, page zoom and fullscreen keep the UI usable', async ({page,context}) => {
    test.skip(baseline);
    await page.emulateMedia({reducedMotion:'reduce'});
    await setup(page);
    expect(await page.evaluate(()=>innerWidth < screen.width && innerHeight < screen.height)).toBe(true);
    await expect(page.locator('.ribbon-command').first()).toHaveCSS('transition-duration','0s');
    await page.getByRole('button',{name:'Styles',exact:true}).click();
    await expect(page.locator('#ribbon-styles-menu')).toBeVisible();
    await page.locator('#header-fullscreen-toggle').click();
    await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
    await expect(page.locator('.formatting-ribbon')).toBeVisible();
    await shot(page,'fullscreen');
    await page.keyboard.press('Escape');
    await page.evaluate(()=>document.fullscreenElement ? document.exitFullscreen() : undefined);
    // Chromium's scale override models visual zoom. The smaller viewport covers reflow.
    const session=await context.newCDPSession(page);
    await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.5});
    await shot(page,'zoom-150');
    await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
    await page.setViewportSize({width:960,height:600});
    await expect(page.locator('.formatting-ribbon')).toBeHidden();
    await shot(page,'zoom-reflow-150');
  });
});
