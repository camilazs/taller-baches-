import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { analyzeImage, validateImage } from './vision.mjs';

const root = fileURLToPath(new URL('./dist/', import.meta.url));