// Gate del MASTER-TEMPLATE §5: un archivo de código mantenido a mano no supera 400 líneas.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MAX_LINES = 400;
const EXT = /\.(ts|mjs|astro|css)$/;
const failures = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (EXT.test(name)) {
      const lines = readFileSync(path, 'utf8').split('\n').length;
      if (lines > MAX_LINES) failures.push(`${path}: ${lines} líneas (máx ${MAX_LINES})`);
    }
  }
}

walk('src');
walk('scripts');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Límites de tamaño OK');
