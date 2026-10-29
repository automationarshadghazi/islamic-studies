import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('core pages have no automated WCAG A/AA violations',async({page})=>{
 for(const route of ['home','paper3','paper4','practice','past-papers','priorities','downloads','sources']){
  await page.goto('/#/'+route);await page.waitForSelector('main h1');
  const {violations}=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();
  expect(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,fail:n.failureSummary}))})),route).toEqual([]);
 }
});
