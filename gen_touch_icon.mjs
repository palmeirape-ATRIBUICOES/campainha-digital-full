import { createRequire } from 'module';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Install sharp locally if not present
if (!existsSync(resolve(__dirname, 'node_modules', 'sharp'))) {
  console.log('Installing sharp...');
  execSync('npm install sharp', { cwd: __dirname, stdio: 'inherit' });
}

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const INPUT  = 'c:/Users/thiag/OneDrive/Área de Trabalho/missoes-da-loja-main/missoes-v2/public/favicon.svg';
const OUTPUT = 'c:/Users/thiag/OneDrive/Área de Trabalho/missoes-da-loja-main/missoes-v2/public/apple-touch-icon.png';

await sharp(INPUT)
  .resize(180, 180)
  .flatten({ background: '#7c3aed' })
  .png()
  .toFile(OUTPUT);

console.log('apple-touch-icon.png gerado com sucesso em:', OUTPUT);
