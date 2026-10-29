import {test,expect} from '@playwright/test';
test('overview and every route load without browser errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('.welcome h1')).toContainText('understanding');
 await expect(page.locator('.paper-card')).toHaveCount(2);
 await page.screenshot({path:'/home/user/study-room-desktop.png',fullPage:true});
 for(const route of ['paper3','paper4','past-papers','priorities','practice','downloads','sources']){
  await page.goto('/#/'+route);await expect(page.locator('main h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(errors).toEqual([]);
});
test('topic review, checklist and read position survive reload',async({page})=>{
 await page.goto('/#/paper3');await page.locator('.topic-card').first().click();
 await expect(page.locator('.prose')).toContainText('Mu');await page.locator('[data-review]').click();
 await page.reload();await expect(page.locator('[data-review]')).toHaveText('Marked as reviewed');
 await page.goto('/#/paper3');const check=page.locator('[data-check]').first();await check.check();await page.reload();await expect(check).toBeChecked();
 await page.goto('/#/home');await expect(page.locator('.side-progress strong')).toHaveText('1 / 7');
 await expect(page.locator('.hero-actions .button')).toHaveText('Continue reading');
});
test('all note sections are accessible and contain content',async({page,request})=>{
 const data=await (await request.get('/content.json')).json();
 for(const id of ['paper3','paper4'])for(const s of data.documents[id].sections){
  await page.goto(`/#/notes/${id}/${s.id}`);await expect(page.locator('main h1')).toHaveText(s.title);
  expect((await page.locator('.prose').innerText()).length).toBeGreaterThan(100);
 }
});
test('search can open a note and filter an archive result',async({page})=>{
 await page.goto('/');await page.locator('#search-open').click();await page.locator('#global-search').fill('Abbasids');
 await expect(page.locator('.search-result').first()).toBeVisible();await page.locator('.search-result').first().click();
 await expect(page.locator('main h1')).toContainText('Abbasids');await expect(page.locator('#search-dialog')).not.toBeVisible();
 await page.locator('#search-open').click();await page.locator('#global-search').fill('women');
 await page.locator('.search-result[data-search-query]').first().click();
 await expect(page.locator('#question-search')).toHaveValue('women');await expect(page.locator('.question-card').first()).toBeVisible();
});
test('past paper filters reset and empty states work',async({page})=>{
 await page.goto('/#/past-papers');await expect(page.locator('.question-card')).toHaveCount(70);
 await page.locator('#paper-filter').selectOption('4');await expect(page.locator('.question-card')).toHaveCount(30);
 await page.locator('#year-filter').selectOption('26');await expect(page.locator('.question-card')).toHaveCount(3);
 await page.locator('#question-search').fill('no-such-topic-xyz');await expect(page.locator('.empty-state')).toContainText('No questions');
 await page.locator('#clear-filters').click();await expect(page.locator('.question-card')).toHaveCount(70);
});
test('practice questions, hidden guidance, drafts and timer work',async({page})=>{
 await page.goto('/#/practice');await expect(page.locator('.practice-paper')).toContainText('Source A');
 await expect(page.locator('.practice-paper')).toContainText('4(b)');
 const detail=page.locator('.guidance-list details').first();await expect(detail).not.toHaveAttribute('open');await detail.locator('summary').click();await expect(detail).toHaveAttribute('open','');
 await page.locator('#draft').fill('A reasoned argument with evidence.');await page.reload();await expect(page.locator('#draft')).toHaveValue('A reasoned argument with evidence.');
 await page.locator('[data-practice="4"]').click();await expect(page.locator('.practice-paper')).toContainText('Cooperation with other faiths');await expect(page.locator('#draft')).toHaveValue('');
 await page.locator('[data-practice="3"]').click();await expect(page.locator('#draft')).toHaveValue('A reasoned argument with evidence.');
 await page.locator('#timer-toggle').click();await expect(page.locator('#timer-toggle')).toHaveText('Pause timer');
 await page.waitForTimeout(1200);await expect(page.locator('#timer-display')).not.toHaveText('90:00');
 await page.locator('#timer-toggle').click();await expect(page.locator('#timer-toggle')).toHaveText('Start timer');
 await page.locator('#timer-reset').click();await expect(page.locator('#timer-display')).toHaveText('90:00');
 const download=page.waitForEvent('download');await page.locator('#export-draft').click();expect((await download).suggestedFilename()).toBe('paper-3-revision-draft.txt');
});
test('download links return actual PDF, CSV and ZIP files',async({page,request})=>{
 await page.goto('/#/downloads');await expect(page.locator('.download-card')).toHaveCount(6);
 const links=await page.locator('main a[download]').evaluateAll(as=>as.map(a=>a.getAttribute('href')));
 for(const link of links){const response=await request.get('/'+link);expect(response.ok()).toBe(true);const body=await response.body();expect(body.length).toBeGreaterThan(100);if(link.endsWith('.pdf'))expect(body.subarray(0,5).toString()).toBe('%PDF-');}
});
test('mobile navigation, reading, search and practice do not overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#menu')).toBeVisible();
 await page.screenshot({path:'/home/user/study-room-mobile.png',fullPage:true});
 await page.locator('#menu').click();await expect(page.locator('#menu')).toHaveAttribute('aria-expanded','true');
 await page.locator('nav a[href="#/paper4"]').click();await expect(page.locator('main h1')).toHaveText('Islam in the modern world');await expect(page.locator('#menu')).toHaveAttribute('aria-expanded','false');
 for(const route of ['practice','sources','past-papers','downloads','priorities']){await page.goto('/#/'+route);await expect(page.locator('main h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.locator('#search-open').click();await page.locator('#global-search').fill('shura');await expect(page.locator('.search-result').first()).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#search-dialog')).not.toBeVisible();
});
test('invalid route and unavailable browser storage fail safely',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})});
 await page.goto('/#/paper3');await expect(page.locator('main h1')).toBeVisible();await page.locator('.topic-card').first().click();await page.locator('[data-review]').click();await expect(page.locator('[data-review]')).toContainText('Marked');
 await page.goto('/#/missing');await expect(page.locator('main h1')).toContainText('isn’t');
});
test('narrow screens and loading failures remain usable',async({page})=>{
 await page.setViewportSize({width:320,height:700});
 for(const route of ['home','paper3','paper4','practice','past-papers','downloads','sources']){
  await page.goto('/#/'+route);await expect(page.locator('main h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
 }
 await page.route('**/content.json',r=>r.fulfill({status:503,body:'unavailable'}));
 await page.reload();await expect(page.locator('main')).toContainText('could not load');
 await expect(page.locator('#reload-site')).toBeVisible();
 await expect(page.locator('main a')).toHaveAttribute('href',/\.zip$/);
});
