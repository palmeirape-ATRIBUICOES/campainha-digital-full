const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname;
const keystorePath = path.join(cwd, 'android.keystore');
const keytoolPath = 'C:\\Users\\thiag\\.bubblewrap\\jdk\\jdk-17.0.11+9\\bin\\keytool.exe';

console.log('==========================================================');
console.log(' INICIANDO COMPILACAO DO APP ANDROID (CAMPAINHA DIGITAL)');
console.log('==========================================================');

// Passo 1: Garantir que a Keystore existe via caminhos relativos para evitar erros com acentos
if (!fs.existsSync(keystorePath)) {
  console.log('[KEYSTORE] android.keystore nao encontrada. Gerando chave...');
  const dname = "CN=Campainha Digital, OU=Mobile, O=Campainha Digital, L=Palmeira, S=Pernambuco, C=BR";
  const cmd = `"${keytoolPath}" -genkeypair -v -keystore ./android.keystore -alias android-alias -keyalg RSA -keysize 2048 -validity 10000 -storepass "senha123" -keypass "senha123" -dname "${dname}"`;
  execSync(cmd, { cwd, stdio: 'inherit' });
  console.log('[KEYSTORE] android.keystore gerada com sucesso!');
} else {
  console.log('[KEYSTORE] android.keystore ja existe.');
}

// Injetar variáveis de ambiente locais
const env = { ...process.env };
env.JAVA_HOME = 'C:\\Users\\thiag\\.bubblewrap\\jdk\\jdk-17.0.11+9';
env.PATH = `C:\\Users\\thiag\\.bubblewrap\\jdk\\jdk-17.0.11+9\\bin;${env.PATH}`;

const manifestPath = path.join(cwd, 'twa-manifest.json');

if (fs.existsSync(manifestPath)) {
  console.log('[INIT] twa-manifest.json encontrado. Ignorando "bubblewrap init" para usar a configuracao existente.');
  runPatchAndBuild();
} else {
  console.log('[INIT] twa-manifest.json nao encontrado. Iniciando configuracao nova...');
  runInitAndBuild();
}

function runInitAndBuild() {
  console.log('[INIT] Executando bubblewrap init...');
  const manifestUrl = 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/manifest.json';
  const init = spawn('npx', ['@bubblewrap/cli', 'init', `--manifest=${manifestUrl}`], { cwd, env, shell: true });

  // Habilitar entrada manual como override de fallback seguro
  process.stdin.resume();
  process.stdin.pipe(init.stdin, { end: false });

  // Objeto de controle para responder cada prompt exatamente uma única vez
  const answered = {};

  init.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);

    const lower = output.toLowerCase();

    // Monitorar e responder às perguntas com base em chaves únicas e locks
    if (lower.includes('domain:') && !answered['domain']) {
      answered['domain'] = true;
      console.log('\n[AUTO-INPUT] Enviando Domain (default)');
      init.stdin.write('\n');
    } else if (lower.includes('url path:') && !answered['url']) {
      answered['url'] = true;
      console.log('\n[AUTO-INPUT] Enviando URL path (default)');
      init.stdin.write('\n');
    } else if (lower.includes('application name:') && !answered['appName']) {
      answered['appName'] = true;
      console.log('\n[AUTO-INPUT] Enviando Application name (default)');
      init.stdin.write('\n');
    } else if (lower.includes('short name:') && !answered['shortName']) {
      answered['shortName'] = true;
      console.log('\n[AUTO-INPUT] Enviando Short name (default)');
      init.stdin.write('\n');
    } else if (lower.includes('application id:') && !answered['appId']) {
      answered['appId'] = true;
      console.log('\n[AUTO-INPUT] Enviando Application ID (br.com.campainhadigital.app)');
      init.stdin.write('br.com.campainhadigital.app\n');
    } else if (lower.includes('starting version code') && !answered['versionCode']) {
      answered['versionCode'] = true;
      console.log('\n[AUTO-INPUT] Enviando Starting version code (default)');
      init.stdin.write('\n');
    } else if (lower.includes('version name:') && !answered['versionName']) {
      answered['versionName'] = true;
      console.log('\n[AUTO-INPUT] Enviando Version name (default)');
      init.stdin.write('\n');
    } else if (lower.includes('display mode:') && !answered['displayMode']) {
      answered['displayMode'] = true;
      console.log('\n[AUTO-INPUT] Enviando Display mode (default)');
      init.stdin.write('\n');
    } else if (lower.includes('orientation:') && !answered['orientation']) {
      answered['orientation'] = true;
      console.log('\n[AUTO-INPUT] Enviando Orientation (default)');
      init.stdin.write('\n');
    } else if (lower.includes('theme color:') && !answered['themeColor']) {
      answered['themeColor'] = true;
      console.log('\n[AUTO-INPUT] Enviando Theme color (default)');
      init.stdin.write('\n');
    } else if (lower.includes('background color:') && !answered['bgColor']) {
      answered['bgColor'] = true;
      console.log('\n[AUTO-INPUT] Enviando Background color (default)');
      init.stdin.write('\n');
    } else if (lower.includes('status bar color:') && !answered['statusBarColor']) {
      answered['statusBarColor'] = true;
      console.log('\n[AUTO-INPUT] Enviando Status bar color (default)');
      init.stdin.write('\n');
    } else if (lower.includes('splash screen color:') && !answered['splashColor']) {
      answered['splashColor'] = true;
      console.log('\n[AUTO-INPUT] Enviando Splash screen color (default)');
      init.stdin.write('\n');
    } else if (lower.includes('maskable icon url:') && !answered['maskableIcon']) {
      answered['maskableIcon'] = true;
      console.log('\n[AUTO-INPUT] Enviando Maskable icon URL (default)');
      init.stdin.write('\n');
    } else if (lower.includes('monochrome icon url:') && !answered['monochromeIcon']) {
      answered['monochromeIcon'] = true;
      console.log('\n[AUTO-INPUT] Enviando Monochrome icon URL (default)');
      init.stdin.write('\n');
    } else if (lower.includes('icon url:') && !answered['iconUrl'] && !lower.includes('maskable') && !lower.includes('monochrome')) {
      answered['iconUrl'] = true;
      console.log('\n[AUTO-INPUT] Enviando Icon URL (default)');
      init.stdin.write('\n');
    } else if (lower.includes('splash screen fade') && !answered['splash']) {
      answered['splash'] = true;
      console.log('\n[AUTO-INPUT] Enviando Splash screen fade duration (default)');
      init.stdin.write('\n');
    } else if (lower.includes('enable site settings') && !answered['settings']) {
      answered['settings'] = true;
      console.log('\n[AUTO-INPUT] Enviando Enable site settings (default)');
      init.stdin.write('\n');
    } else if (lower.includes('include dark theme') && !answered['darkTheme']) {
      answered['darkTheme'] = true;
      console.log('\n[AUTO-INPUT] Enviando Include dark theme (default)');
      init.stdin.write('\n');
    } else if (lower.includes('enable notifications:') && !answered['notifications']) {
      answered['notifications'] = true;
      console.log('\n[AUTO-INPUT] Enviando Enable notifications (default)');
      init.stdin.write('\n');
    } else if (lower.includes('play billing') && !answered['billing']) {
      answered['billing'] = true;
      console.log('\n[AUTO-INPUT] Enviando Include play billing (default)');
      init.stdin.write('\n');
    } else if (lower.includes('geolocation') && !answered['geolocation']) {
      answered['geolocation'] = true;
      console.log('\n[AUTO-INPUT] Enviando Geolocation (default)');
      init.stdin.write('\n');
    } else if (lower.includes('key store location') && !answered['signingKey']) {
      answered['signingKey'] = true;
      console.log('\n[AUTO-INPUT] Enviando Location of the Signing Key (./android.keystore)');
      init.stdin.write('./android.keystore\n');
    } else if (lower.includes('key name') && !answered['alias']) {
      answered['alias'] = true;
      console.log('\n[AUTO-INPUT] Enviando Key name (alias) (android-alias)');
      init.stdin.write('android-alias\n');
    } else if (lower.includes('include app shortcuts:') && !answered['shortcuts']) {
      answered['shortcuts'] = true;
      console.log('\n[AUTO-INPUT] Enviando Include app shortcuts (default)');
      init.stdin.write('\n');
    }
  });

  init.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  init.on('close', (code) => {
    console.log(`\n[INIT] Concluido com codigo ${code}`);
    if (code !== 0) {
      console.error('[INIT] Falhou. Encerrando.');
      process.exit(code);
    }
    runPatchAndBuild();
  });
}

function runPatchAndBuild() {
  // Passo 2.5: Injetar a flag android.overridePathCheck=true no gradle.properties
  // para permitir compilação com acentos no caminho do Windows (por exemplo, "Área de Trabalho")
  const gradlePropertiesPath = path.join(cwd, 'gradle.properties');
  if (fs.existsSync(gradlePropertiesPath)) {
    console.log('[PATCH] Injetando android.overridePathCheck=true em gradle.properties...');
    let content = fs.readFileSync(gradlePropertiesPath, 'utf8');
    if (!content.includes('android.overridePathCheck')) {
      fs.appendFileSync(gradlePropertiesPath, '\nandroid.overridePathCheck=true\n');
      console.log('[PATCH] Injetado com sucesso!');
    } else {
      console.log('[PATCH] Flag android.overridePathCheck ja existe em gradle.properties.');
    }
  } else {
    console.warn('[PATCH] gradle.properties nao encontrado para injetar configuracao!');
  }

  // Passo 3: Inicia o processo Bubblewrap 'build'
  console.log('[BUILD] Executando bubblewrap build...');
  const build = spawn('npx', ['@bubblewrap/cli', 'build'], { cwd, env, shell: true });

  const buildAnswered = {};

  build.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);

    const lowerBuild = output.toLowerCase();

    // Responder senhas de assinatura com locks individuais em tempo real
    if (lowerBuild.includes('password for the key store:') && !buildAnswered['keystorePassword']) {
      buildAnswered['keystorePassword'] = true;
      console.log('\n[AUTO-INPUT-BUILD] Enviando Key Store Password (senha123)');
      build.stdin.write('senha123\n');
    } else if (lowerBuild.includes('password for the key:') && !buildAnswered['keyPassword']) {
      buildAnswered['keyPassword'] = true;
      console.log('\n[AUTO-INPUT-BUILD] Enviando Key Password (senha123)');
      build.stdin.write('senha123\n');
    }
  });

  build.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  build.on('close', (buildCode) => {
    console.log(`[BUILD] Concluido com codigo ${buildCode}`);
    if (buildCode !== 0) {
      console.error('[BUILD] Falhou. Encerrando.');
      process.exit(buildCode);
    }

    // Passo 4: Copiar pacotes finais gerados para a pasta raiz do projeto
    console.log('[EXPORT] Copiando pacotes gerados para a pasta raiz...');
    
    const getFilesRecursively = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          if (!file.startsWith('.') && file !== 'node_modules') {
            results = results.concat(getFilesRecursively(filePath));
          }
        } else {
          results.push(filePath);
        }
      });
      return results;
    };

    const allFiles = getFilesRecursively(cwd);
    const apkSource = allFiles.find(f => f.endsWith('-release-signed.apk'));
    const aabSource = allFiles.find(f => f.endsWith('release-bundle.aab') || f.endsWith('-release-signed.aab'));

    if (apkSource) {
      fs.copyFileSync(apkSource, path.join(cwd, 'CampainhaDigital.apk'));
      console.log(`[EXPORT] APK copiado com sucesso para: ${path.join(cwd, 'CampainhaDigital.apk')}`);
    } else {
      console.warn('[EXPORT] APK assinado nao encontrado!');
    }

    if (aabSource) {
      fs.copyFileSync(aabSource, path.join(cwd, 'CampainhaDigital.aab'));
      console.log(`[EXPORT] AAB (Bundle da Play Store) copiado para: ${path.join(cwd, 'CampainhaDigital.aab')}`);
    } else {
      console.warn('[EXPORT] AAB assinado nao encontrado!');
    }

    console.log('==========================================================');
    console.log(' PROCESSO DE COMPILACAO ANDROID CONCLUIDO COM SUCESSO!');
    console.log('==========================================================');
    process.exit(0);
  });
}
