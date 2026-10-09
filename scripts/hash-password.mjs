// Genera ADMIN_PASSWORD_HASH. Uso: npm run admin:hash   (o: npm run admin:hash -- --generate)
// La clave nunca se guarda ni se imprime, salvo con --generate (se muestra una sola vez).
import { generatePassword, hashPassword, passwordProblems } from '../src/core/password.ts';

function ask(prompt) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      console.error('Ejecutalo en una terminal interactiva.');
      process.exit(1);
    }
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (char === '\u0003') process.exit(1);
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function chooseInteractively() {
  for (;;) {
    const password = await ask('Nueva clave (no se muestra): ');
    const problems = passwordProblems(password);
    if (problems.length) {
      console.error(problems.map((p) => `  - ${p}`).join('\n'));
      continue;
    }
    if ((await ask('Repetila: ')) === password) return password;
    console.error('  No coinciden, probá de nuevo.');
  }
}

const generated = process.argv.includes('--generate');
const password = generated ? generatePassword() : await chooseInteractively();
const hash = await hashPassword(password);

if (generated) console.log(`\nClave generada (guardala en un gestor de claves, no se vuelve a mostrar):\n${password}`);
console.log(`\nCargá esta variable en Vercel (Production) y en tu .env local:\n\nADMIN_PASSWORD_HASH=${hash}\n`);
