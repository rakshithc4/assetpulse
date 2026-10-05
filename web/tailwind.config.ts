import type { Config } from 'tailwindcss';
import fs from 'node:fs';
import path from 'node:path';
import type { Tokens } from './src/lib/tokens.schema';

const realTokens = path.join(__dirname, '../design/tokens.json');
const tokensPath = fs.existsSync(realTokens) ? realTokens : path.join(__dirname, '../design/tokens.example.json');
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8')) as Tokens;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: tokens.surface,
        content: tokens.text,
        severity: tokens.severity,
        opstatus: tokens.opstatus,
        lifecycle: tokens.lifecycle,
      },
      fontFamily: {
        sans: tokens.type.fontSans.split(',').map((f) => f.trim()),
        mono: tokens.type.fontMono.split(',').map((f) => f.trim()),
      },
      fontSize: tokens.type.scale,
      borderRadius: tokens.radius,
    },
  },
  plugins: [],
};

export default config;
