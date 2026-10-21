import {defineConfig} from '@playwright/test';
import base from './playwright.leave-completion.config';
export default defineConfig({...base,testDir:'./tests/leave-feedback'});
