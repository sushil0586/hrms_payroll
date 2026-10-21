import {defineConfig} from '@playwright/test';
import base from './playwright.leave-four-ess.config';
export default defineConfig({...base,grep:/mobile\/tablet density/,outputDir:'../docs/qa/evidence/leave-four-workspaces/ess-mobile/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-four-workspaces/ess-mobile/results.json'}]]});
