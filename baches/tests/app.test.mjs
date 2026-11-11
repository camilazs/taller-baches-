import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';
import { validateImage, validateAnalysis, analyzeImage } from '../vision.mjs';
import { seedRecords } from '../dist/records.mjs';