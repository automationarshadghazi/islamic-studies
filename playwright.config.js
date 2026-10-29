import {defineConfig} from '@playwright/test';
import chromium from '@sparticuz/chromium';
export default defineConfig({testDir:'./tests',timeout:30000,fullyParallel:false,workers:1,use:{baseURL:'http://127.0.0.1:3000',headless:true,launchOptions:{executablePath:await chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']}},reporter:'list'});
