import {defineConfig} from '@playwright/test';
import base from './playwright.ess6-regression.config';
export default defineConfig({...base,testMatch: process.env.ESS6_FILE!,use:{...base.use,baseURL:process.env.ESS6_URL},reporter:[['list'],['json',{outputFile:process.env.PLAYWRIGHT_JSON_OUTPUT_FILE}]]});
