const { test, expect } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { cases, reportAppendix } = require('../helpers/screen-tables');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');
const { loadFixture } = require('../helpers/fixture-loader');

async function measure(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.querySelector('.markdown-body').getAnimations({subtree:true})
      .filter(animation => Number.isFinite(animation.effect.getTiming().iterations))
      .map(animation => animation.finished.catch(() => {})));
  });
  return page.locator('.markdown-body').evaluate(article => {
    const css = getComputedStyle(article);
    const bounds = article.getBoundingClientRect();
    const contentWidth = bounds.width - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    const tables = [...article.querySelectorAll('table')].map(table => {
      const wrapper = table.parentElement;
      const styles = getComputedStyle(table);
      const row = table.rows[0];
      const rangeOverflow = [...table.querySelectorAll('td,th')].flatMap(cell => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        const box = cell.getBoundingClientRect();
        return [...range.getClientRects()].filter(rect => rect.width > 0
          && (rect.left < box.left - 1 || rect.right > box.right + 1));
      }).length;
      return { width: table.getBoundingClientRect().width, scroll: wrapper.scrollWidth - wrapper.clientWidth,
        wrapperWidth: wrapper.getBoundingClientRect().width, rangeOverflow,
        columns: [...row.cells].map(cell => cell.getBoundingClientRect().width),
        rows: [...table.rows].map(row => row.getBoundingClientRect().height),
        font: styles.fontSize, display: styles.display, layout: styles.tableLayout,
        cells: [...table.querySelectorAll('th,td')].map(cell => ({text:cell.textContent,
          align:getComputedStyle(cell).textAlign,padding:getComputedStyle(cell).padding,
          color:getComputedStyle(cell).color,border:getComputedStyle(cell).borderLeft,
          background:getComputedStyle(cell.parentElement).backgroundColor})),
      };
    });
    return { width: bounds.width, contentWidth, tables, font: css.fontSize, lineHeight: css.lineHeight,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      articleOverflow: article.scrollWidth - article.clientWidth };
  });
}

for (const theme of ['light','dark']) {
  test(`screen tables match fresh HTML at all reading widths in ${theme}`, async ({page,context,baseURL},testInfo) => {
    test.setTimeout(120000);
    await installStandaloneCdnMirror(context);
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page,theme);
    await renderMarkdown(page,cases);
    await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
    const html = await captureHtmlExport(page);
    const exported = await context.newPage();
    try {
      await exported.setContent(html.replace('<head>',`<head><base href="${baseURL}/">`));
      for (const width of [320,390,430,768,1024,1440]) {
        await page.setViewportSize({width,height:1024});
        const current = await measure(page);
        expect(current.documentOverflow).toBeLessThanOrEqual(1);
        expect(current.articleOverflow).toBeLessThanOrEqual(1);
        expect(parseFloat(current.lineHeight)/parseFloat(current.font)).toBeCloseTo(1.4,3);
        const [normal,appendix,long,many,authored,spans] = current.tables;
        expect(normal.scroll).toBe(0);
        expect(normal.cells[0].padding).toBe('6px 13px');
        expect(normal.font).toBe(current.font);
        expect(appendix.layout).toBe('fixed');
        const compact = current.contentWidth <= 568;
        expect(parseFloat(appendix.font)/parseFloat(current.font)).toBeCloseTo(compact ? 0.875 : 0.92,3);
        expect(appendix.columns[1]).toBeGreaterThan(appendix.columns[0]);
        expect(appendix.columns[5]).toBeGreaterThan(appendix.columns[3]*1.8);
        expect(appendix.rows[3]).toBeLessThan(250);
        if (width >= 1024) expect(appendix.scroll).toBeLessThanOrEqual(1);
        if (width <= 430) expect(appendix.scroll).toBeGreaterThan(300);
        expect(long.rangeOverflow).toBe(0);
        expect(long.width).toBeLessThanOrEqual(long.wrapperWidth + 1);
        expect(many.font).toBe(compact ? '14px' : current.font);
        expect(authored.width).toBeCloseTo(700,0);
        expect(authored.layout).toBe('auto');
        expect(authored.columns[0]).toBeCloseTo(160,0);
        expect(authored.cells[2].color).toBe('rgb(18, 52, 86)');
        expect(spans.layout).toBe('auto');
        current.tables.forEach(table => {
          expect(table.display).toBe('table');
          expect(table.rangeOverflow, JSON.stringify(table.columns)).toBe(0);
        });
        await exported.setViewportSize({width:Math.round(current.width),height:1024});
        await exported.evaluate(width => { document.body.style.width = `${width}px`; },current.width);
        const fresh = await measure(exported);
        expect(fresh.contentWidth).toBeCloseTo(current.contentWidth,0);
        fresh.tables.forEach((table,index) => {
          const reference=current.tables[index];
          expect(table.cells).toEqual(reference.cells);
          expect(table.font).toBe(reference.font);
          expect(table.width, `Table ${index} at ${width}px`).toBeCloseTo(reference.width,0);
          table.columns.forEach((column,col) => expect(column).toBeCloseTo(reference.columns[col],0));
          table.rows.forEach((row,idx) => expect(row).toBeCloseTo(reference.rows[idx],0));
        });
        if (width===1440) {
          expect(normal.width).toBeCloseTo(148,0);
          expect(normal.rows.reduce((sum,height)=>sum+height,1)).toBeCloseTo(110.546875,0);
        }
        if ([390,768,1440].includes(width)) {
          await testInfo.attach(`tables-${theme}-${width}`,{body:await page.screenshot(),contentType:'image/png'});
        }
      }
      await page.setViewportSize({width:1100,height:900});
      await page.evaluate(() => window.MarkTideViewManager.setView('split'));
      const split=await measure(page);
      expect(split.contentWidth).toBeLessThan(500);
      expect(split.tables[1].scroll).toBeGreaterThan(200);
      expect(split.articleOverflow).toBeLessThanOrEqual(1);
      await exported.setViewportSize({width:Math.round(split.width),height:900});
      await exported.evaluate(width => { document.body.style.width = `${width}px`; },split.width);
      const fresh=await measure(exported);
      fresh.tables.forEach((table,index)=>expect(table.rows).toEqual(split.tables[index].rows));
      await expect(page.locator('#spans [rowspan="2"]')).toHaveCount(2);
      await expect(page.locator('#spans [colspan]')).toHaveCount(2);
      await expect(page.locator('#authored-columns col')).toHaveCount(2);
      const wrapper=page.locator('.marktide-table-scroll').nth(1);
      await wrapper.focus();
      await page.keyboard.press('ArrowRight');
      await expect.poll(()=>wrapper.evaluate(element=>element.scrollLeft)).toBeGreaterThan(0);
      await wrapper.hover();
      const before=await wrapper.evaluate(element=>element.scrollLeft);
      await page.mouse.wheel(180,0);
      await expect.poll(()=>wrapper.evaluate(element=>element.scrollLeft)).toBeGreaterThan(before);
      const repeated=await page.evaluate(() => {
        const html=window.MarkTideRenderer.prepareRenderedHtml(document.querySelector('.markdown-body').innerHTML,{mode:'preview'});
        const copy=new DOMParser().parseFromString(html,'text/html');
        return {nested:copy.querySelectorAll('.marktide-table-scroll .marktide-table-scroll').length,
          cols:copy.querySelectorAll('.marktide-screen-columns').length};
      });
      expect(repeated).toEqual({nested:0,cols:1});
    } finally {await exported.close();}
  });
}

test('fixture and additional table grids stay locally scrollable',async ({page,context,baseURL})=>{
  test.setTimeout(120000);
  await installStandaloneCdnMirror(context);
  await context.route('https://img.shields.io/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20"/>'}));
  await page.goto('/index.html');
  await waitForMarkTide(page);
  const sources=[loadFixture('02_tables.md'),loadFixture('02-Tables-old.md')];
  if(process.env.MARKTIDE_ADDITIONAL_TABLE_SOURCE) sources.push(fs.readFileSync(
    path.resolve(__dirname,'../..',process.env.MARKTIDE_ADDITIONAL_TABLE_SOURCE),'utf8'));
  for(const source of sources){
    await renderMarkdown(page,source);
    await page.evaluate(()=>window.MarkTideViewManager.setView('preview-only'));
    const html=await captureHtmlExport(page);
    const exported=await context.newPage();
    try {
      await exported.setContent(html.replace('<head>',`<head><base href="${baseURL}/">`));
      for(const width of [390,768,1440]) {
        await page.setViewportSize({width,height:1024});
        await exported.setViewportSize({width,height:1024});
        for(const surface of [page,exported]) {
          const current=await measure(surface);
          expect(current.documentOverflow).toBeLessThanOrEqual(1);
          expect(current.articleOverflow).toBeLessThanOrEqual(1);
          expect(current.tables.length).toBeGreaterThan(10);
          await expect(surface.locator('.markdown-body table:not(.marktide-table-scroll > table)')).toHaveCount(0);
          await expect(surface.locator('.marktide-table-scroll:not([tabindex="0"])')).toHaveCount(0);
        }
      }
    } finally {await exported.close();}
  }
});

test('authored widths and media keep browser sizing and touch scrolling', async ({page,context,baseURL}) => {
  await installStandaloneCdnMirror(context);
  await context.route('**/table-image.svg',route=>route.fulfill({contentType:'image/svg+xml',
    body:'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"/>'}));
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, `${reportAppendix}\n\n<table width="650" id="width-attribute"><tr><th>Label</th><th>Value</th></tr><tr><td>Authored</td><td>Keep the width attribute.</td></tr></table>\n\n<table id="media-table"><tr><th>Image</th><th>Description</th><th>Status</th><th>Count</th><th>Reference</th></tr><tr><td><img src="/table-image.svg" width="120" height="60" alt="Inline table image"></td><td>${'A longer explanation should not change the authored image. '.repeat(3)}</td><td>OK</td><td>1</td><td>Reference</td></tr></table>`);
  const html=await captureHtmlExport(page);
  const exported=await context.newPage();
  try {
    await exported.setContent(html.replace('<head>',`<head><base href="${baseURL}/">`));
    for(const surface of [page,exported]) {
      await expect(surface.locator('#width-attribute')).toHaveCSS('width','650px');
      await expect(surface.locator('#media-table')).not.toHaveClass(/marktide-screen-balanced/);
      await expect(surface.locator('#media-table img')).toHaveCSS('width','120px');
      await expect(surface.locator('#media-table img')).toHaveCSS('height','60px');
      await expect(surface.locator('#media-table figcaption')).toHaveCount(0);
    }
    const touchContext=await page.context().browser().newContext({hasTouch:true,isMobile:true,
      viewport:{width:390,height:844}});
    const touch=await touchContext.newPage();
    try {
      await installStandaloneCdnMirror(touchContext);
      await touch.setContent(html.replace('<head>',`<head><base href="${baseURL}/">`));
      const wrapper=touch.locator('.marktide-table-scroll').first();
      const box=await wrapper.boundingBox();
      const session=await touchContext.newCDPSession(touch);
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width-25,y:box.y+55}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width-125,y:box.y+55}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+25,y:box.y+55}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await expect.poll(()=>wrapper.evaluate(element=>element.scrollLeft)).toBeGreaterThan(0);
      expect(await touch.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    } finally {await touchContext.close();}
  } finally {await exported.close();}
});

test('table visual review uses the exact report example',async ({page,context,baseURL})=>{
  test.skip(!process.env.MARKTIDE_SCREEN_TABLE_REVIEW_DIR,'Optional manual review artifacts');
  await installStandaloneCdnMirror(context);
  await page.goto('/index.html');await waitForMarkTide(page);
  await setTheme(page,'light');await renderMarkdown(page,reportAppendix);
  await page.evaluate(()=>window.MarkTideViewManager.setView('preview-only'));
  await page.locator('#close-dropzone').click();
  const html=await captureHtmlExport(page);
  fs.writeFileSync(`${process.env.MARKTIDE_SCREEN_TABLE_REVIEW_DIR}/table-review.html`,html);
  const exported=await context.newPage();
  try {
    await exported.setContent(html.replace('<head>',`<head><base href="${baseURL}/">`));
    for(const width of [390,768,1440]){
      await page.setViewportSize({width,height:900});await measure(page);
      await page.screenshot({path:`${process.env.MARKTIDE_SCREEN_TABLE_REVIEW_DIR}/preview-${width}.png`,fullPage:true});
      const current=await measure(page);
      await exported.setViewportSize({width:Math.round(current.width),height:900});
      await exported.evaluate(width=>{document.body.style.width=`${width}px`;},current.width);
      await measure(exported);
      await exported.screenshot({path:`${process.env.MARKTIDE_SCREEN_TABLE_REVIEW_DIR}/html-${width}.png`,fullPage:true});
      console.log('Appendix B review',width,current.tables[0].columns,current.tables[0].rows[3],current.tables[0].scroll);
    }
  }finally{await exported.close();}
});

test('screen table preparation is absent from real PDF export',async ({page,context,baseURL})=>{
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page,reportAppendix);
  const prepared=await capturePdfPreparation(page,'Screen table print isolation',{includeDocumentHtml:true});
  const printed=await context.newPage();
  try {
    await printed.emulateMedia({media:'print'});
    await printed.setContent(prepared.documentHtml.replace('<head>',`<head><base href="${baseURL}/">`));
    await printed.evaluate(()=>document.fonts.ready);
    await expect(printed.locator('.marktide-table-scroll,.marktide-screen-columns,.marktide-screen-long-value')).toHaveCount(0);
    await expect(printed.locator('table')).toHaveCSS('font-size','12.201px');
    await expect(printed.locator('td').first()).toHaveCSS('padding','3px 4px');
    const pdf=await printed.pdf({preferCSSPageSize:true,printBackground:true,path:process.env.MARKTIDE_SCREEN_TABLE_REVIEW_PDF||undefined});
    const extracted=spawnSync('pdftotext',['-bbox','-','-'],{input:pdf,encoding:'utf8'});
    expect(extracted.status).toBe(0);
    expect(extracted.stdout).toContain('VAL-DNS-FP-01');
    if(process.env.MARKTIDE_SCREEN_TABLE_BASELINE_PDF){
      const baseline=spawnSync('pdftotext',['-bbox',process.env.MARKTIDE_SCREEN_TABLE_BASELINE_PDF,'-'],{encoding:'utf8'});
      expect(baseline.status).toBe(0);
      const geometry=text=>text.replace(/<head>[\s\S]*?<\/head>/,'');
      expect(geometry(extracted.stdout)).toBe(geometry(baseline.stdout));
    }
  } finally {await printed.close();}
});
