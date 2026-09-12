// Real Electron checks for the DESIGN.md interaction and rendering contract.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright');

(async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mednotes-design-'));
  const app = await electron.launch({ executablePath: require('electron'), args: [path.join(__dirname, '..')], env: { ...process.env, MEDNOTES_HOME: home } });
  try {
    const page = await app.firstWindow();
    page.setDefaultTimeout(180000);
    await page.waitForSelector('#composer-text');
    await page.locator('#composer-text').fill('Dyspnea differential: pulmonary embolism and pneumonia.\n' + 'A long clinical note with meaningful details. '.repeat(30));
    await page.click('#save-btn');
    await page.waitForSelector('.post');
    assert.equal(await page.locator('#note-count').textContent(), '1 note');
    const original = await page.locator('.post-text').textContent();
    await page.getByRole('button', { name: 'Edit text', exact: true }).click();
    await page.screenshot({ path: path.join(home, 'editor.png'), animations: 'disabled', scale: 'css' });
    await page.fill('#edit-text', 'Cancelled draft');
    await page.click('#edit-cancel');
    assert.equal(await page.locator('.post-text').textContent(), original);
    await page.getByRole('button', { name: 'Edit text', exact: true }).click();
    const revised = 'Dyspnea differential: pulmonary embolism and pneumonia.\n\nClinical pearls from today’s respiratory session. Compare onset, risk factors, and associated findings. Revisit the differential before tomorrow’s tutorial.';
    await page.fill('#edit-text', revised);
    await page.click('#edit-save');
    await page.waitForFunction(() => !document.querySelector('#edit-dialog').open);
    assert.equal(await page.locator('.post-text').textContent(), revised);
    const persisted = await page.evaluate(() => window.mednotes.readPosts());
    for (const folder of ['working', 'mirror']) assert.equal(fs.readFileSync(path.join(home, folder, persisted[0].id, 'text.md'), 'utf8'), revised);
    await page.getByRole('button', { name: 'Add tag', exact: true }).click();
    await page.fill('#edit-tag', 'Respiratory');
    await page.click('#edit-save');
    await page.waitForFunction(() => !document.querySelector('#edit-dialog').open);
    assert.equal(await page.locator('.tag-pill').textContent(), 'Respiratory');
    assert.equal(await page.locator('.stats, .welcome, [data-view]').count(), 0);
    assert.equal(await page.locator('.side-rail').count(), 1);
    assert.equal(await page.locator('.identity-panel').count(), 1);
    assert.ok(await page.locator('.medica-logo').evaluate(el => el.complete && el.naturalWidth > 0));
    assert.ok(fs.readFileSync(path.join(__dirname, '../ui/assets/medica-logo.png')).equals(fs.readFileSync(path.join(__dirname, '../../public/Medica-logo.png'))));
    const shortcut = process.platform === 'darwin' ? 'Meta+k' : 'Control+k';
    await page.locator('#composer-text').focus();
    await page.keyboard.press(shortcut);
    assert.equal(await page.locator('#search-input').evaluate(el => el === document.activeElement), true);
    await page.locator('#close-search').focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.locator('#date-clear').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#close-search').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement.id === 'composer-text');
    await page.click('#open-search');
    await page.fill('#search-input', 'dyspnea');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.search-result');
    await page.screenshot({ path: path.join(home, 'search.png') });
    await page.click('.search-result');
    await page.waitForFunction(() => document.activeElement.classList.contains('post'));
    await page.click('#open-search');
    await page.mouse.click(2, 2);
    await page.waitForFunction(() => !document.querySelector('dialog').open);

    // Measure interaction during real model work, after model warmup.
    await page.evaluate(() => {
      window.frameGaps = [];
      window.measureFrames = true;
      let previous = performance.now();
      function sample(now) {
        window.frameGaps.push(now - previous); previous = now;
        if (window.measureFrames) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
      window.embeddingWork = Promise.all(Array.from({ length: 16 }, (_, i) => window.mednotes.searchPosts({ query: 'Clinical differential diagnosis ' + i })));
    });
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press(shortcut);
      await page.fill('#search-input', 'clinical reasoning ' + i);
      await page.keyboard.press('Escape');
      await page.locator('#composer-text').fill('Draft during embedding ' + i);
      await page.mouse.wheel(0, i % 2 ? -200 : 200);
    }
    await page.evaluate(() => window.embeddingWork);
    const timing = await page.evaluate(() => {
      window.measureFrames = false;
      const gaps = window.frameGaps.slice(1).sort((a, b) => a - b);
      return { frames: gaps.length, p95: gaps[Math.floor(gaps.length * .95)], max: Math.max(...gaps) };
    });
    console.log('Embedding-active frame intervals (ms):', timing);

    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
    // Deterministic error/empty/race coverage, after real-model verification.
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('search-posts');
      ipcMain.handle('search-posts', async (_event, { query }) => {
        if (query === 'error') throw new Error('Test search failure');
        if (query === 'slow') {
          await new Promise(resolve => setTimeout(resolve, 300));
          return [{ id: 'stale', text: 'Stale result' }];
        }
        return [];
      });
    });
    console.log('Testing search errors');
    await page.click('#open-search');
    await page.fill('#search-input', 'error');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#search-status').textContent.includes('Search failed'));
    await page.fill('#search-input', 'slow');
    await page.keyboard.press('Enter');
    await page.fill('#search-input', 'empty');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#search-status').textContent.includes('No matching'));
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.search-result').count(), 0);
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press(shortcut);
    assert.equal(await page.locator('#search-dialog').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Edit text', exact: true }).click();
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('edit-post');
      ipcMain.handle('edit-post', () => { throw new Error('Test edit failure'); });
    });
    await page.fill('#edit-text', 'Keep this unsaved draft');
    await page.click('#edit-save');
    await page.waitForFunction(() => document.querySelector('#edit-status').textContent.includes('Could not save'));
    assert.equal(await page.locator('#edit-text').inputValue(), 'Keep this unsaved draft');
    await page.click('#edit-cancel');
    await page.waitForTimeout(200);
    await page.locator('#composer-text').fill('');
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(home, 'desktop.png'), animations: 'disabled', scale: 'css' });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(480, 720));
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(home, 'narrow.png'), animations: 'disabled', scale: 'css' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const boxes = await page.evaluate(() => {
      const field = document.querySelector('.capture-field').getBoundingClientRect();
      return ['mic-btn', 'camera-btn'].every(id => {
        const rect = document.getElementById(id).getBoundingClientRect();
        return rect.right <= field.right && rect.top >= field.top && rect.bottom <= field.bottom;
      });
    });
    assert.equal(boxes, true);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    console.log('Design UI checks passed. Screenshots:', home);
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
