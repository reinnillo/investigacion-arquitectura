#!/usr/bin/env node
// Runner de evals del skill investigacion-arquitectura.
// Para cada caso (carpeta con prompt.md y esperado.json): prepara un directorio de trabajo, ejecuta `claude -p` con el
// skill cargado como plugin y, como línea base, sin ningún skill; puntúa el folder resultante con scripts/evaluar.mjs y,
// con --juez, pide a un modelo que compruebe los graders semánticos (graders/*.md). Escribe resultados/<fecha>/.
//
// Uso: node correr.mjs [--caso <texto>] [--sin-base] [--repeticiones N] [--concurrencia N] [--modelo M]
//                      [--juez] [--modelo-juez M] [--umbral 0.85] [--mantener] [--permitir-copia-local] [--seco]
//                      [--salida <dir>]
//   --seco    prepara y evalúa sin llamar a claude (comprueba el pipeline sin coste)
// Exit 0 si todas las ejecuciones con skill aprueban, 1 si alguna no, 2 si el uso es incorrecto.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { evaluar } from '../scripts/lib/evaluacion.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(HERE, '..', '..', '..');
const SKILL = 'investigacion-arquitectura';
const PLUGIN_SKILL = `${SKILL}:${SKILL}`; // nombre con el que se carga desde el plugin; el nombre suelo es una copia local

// ---------- funciones puras (probadas en pruebas/correr.test.mjs) ----------

export function parsePrompt(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { settings: {}, prompt: text.trim() };
  const settings = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, k, raw] = kv;
    settings[k] = /^\[.*\]$/.test(raw) ? raw.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
      : /^\d+$/.test(raw) ? Number(raw) : raw;
  }
  return { settings, prompt: m[2].trim() };
}

export function parseGraders(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => {
    const { settings, prompt } = parsePrompt(readFileSync(join(dir, f), 'utf8'));
    return { archivo: f, tipo: settings.type ?? 'llm', texto: prompt };
  }).filter((g) => g.tipo === 'llm' && !/^The (result matches|response completes)/.test(g.texto));
}

// Extrae de la salida stream-json de `claude -p` qué se cargó, el uso del skill, el texto final, el coste y los tokens.
// Sólo cuenta como uso del skill el del plugin; usar una copia local con el mismo nombre se marca como contaminación.
export function parseStream(stdout) {
  const out = { skill_usada: false, copia_local_usada: false, plugin_cargado: false, copia_local_cargada: false, skills: [], texto: '', coste_usd: null, duracion_ms: null, turnos: null, error: null, tokens: null };
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim().startsWith('{')) continue;
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === 'system' && ev.subtype === 'init') {
      out.plugin_cargado = (ev.skills ?? []).includes(PLUGIN_SKILL);
      out.copia_local_cargada = (ev.skills ?? []).includes(SKILL);
    }
    if (ev.type === 'assistant') {
      for (const c of ev.message?.content ?? []) {
        if (c.type === 'tool_use' && c.name === 'Skill') {
          const name = c.input?.skill ?? c.input?.name ?? '';
          out.skills.push(name);
          if (name === PLUGIN_SKILL) out.skill_usada = true;
          else if (name === SKILL) out.copia_local_usada = true;
        }
      }
    }
    if (ev.type === 'result') {
      out.texto = ev.result ?? '';
      out.coste_usd = ev.total_cost_usd ?? null;
      out.duracion_ms = ev.duration_ms ?? null;
      out.turnos = ev.num_turns ?? null;
      out.error = ev.is_error ? (ev.subtype ?? 'error') : null;
      const u = ev.usage ?? {};
      out.tokens = (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    }
  }
  return out;
}

export function claudeArgs({ settings, conSkill, modelo }) {
  const args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits',
    '--max-turns', String(settings.max_turns ?? 80)];
  if (settings.allowed_tools?.length) args.push('--allowedTools', ...settings.allowed_tools);
  if (conSkill) args.push('--plugin-dir', PLUGIN_ROOT);
  else args.push('--disallowedTools', 'Skill');
  if (modelo) args.push('--model', modelo);
  return args;
}

export function veredictosDelJuez(texto, graders) {
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) return graders.map((g) => ({ ...g, aprobado: false, evidencia: 'el juez no devolvió JSON' }));
  let data;
  try { data = JSON.parse(m[0]); } catch { return graders.map((g) => ({ ...g, aprobado: false, evidencia: 'JSON del juez inválido' })); }
  const list = data.veredictos ?? [];
  return graders.map((g, i) => {
    const v = list.find((x) => x.n === i + 1) ?? list[i] ?? {};
    return { ...g, aprobado: v.aprobado === true, evidencia: v.evidencia ?? '—' };
  });
}

export function resumen(runs) {
  const by = (arm) => runs.filter((r) => r.brazo === arm);
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const stats = (arm) => {
    const rs = by(arm);
    return {
      ejecuciones: rs.length,
      puntuacion: mean(rs.map((r) => r.evaluacion.puntuacion)),
      aprobadas: rs.filter((r) => r.evaluacion.aprobado).length,
      skill_usada: rs.filter((r) => r.claude.skill_usada).length,
      coste_usd: mean(rs.map((r) => r.claude.coste_usd).filter((x) => x != null)),
      duracion_s: mean(rs.map((r) => r.claude.duracion_ms).filter((x) => x != null).map((x) => x / 1000)),
      juez: mean(rs.filter((r) => r.juez?.length).map((r) => r.juez.filter((v) => v.aprobado).length / r.juez.length)),
    };
  };
  const con = stats('con_skill'), sin = stats('sin_skill');
  const delta = con.puntuacion != null && sin.puntuacion != null ? con.puntuacion - sin.puntuacion : null;
  return { con_skill: con, sin_skill: sin, delta_puntuacion: delta };
}

// ---------- efectos ----------

function run(cmd, args, { cwd, input, timeoutMs }) {
  return new Promise((done) => {
    const child = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '', stderr = '', timedOut = false;
    const timer = timeoutMs ? setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs) : null;
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => { stderr += String(e); });
    child.on('close', (code) => { if (timer) clearTimeout(timer); done({ code, stdout, stderr, timedOut }); });
    if (input != null) child.stdin.end(input); else child.stdin.end();
  });
}

function discover(filter) {
  return readdirSync(HERE).map((d) => join(HERE, d))
    .filter((d) => statSync(d).isDirectory() && existsSync(join(d, 'prompt.md')) && existsSync(join(d, 'esperado.json')))
    .filter((d) => !filter || d.split(sep).pop().includes(filter));
}

function folderDump(dir, limit = 120_000) {
  if (!existsSync(dir)) return '(el folder no existe)';
  const parts = [];
  const walk = (d) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.md')) parts.push(`===== ${relative(dir, p).split(sep).join('/')}\n${readFileSync(p, 'utf8')}`);
    }
  };
  walk(dir);
  const all = parts.join('\n\n');
  return all.length > limit ? `${all.slice(0, limit)}\n[… recortado a ${limit} caracteres]` : all;
}

async function juzgar({ graders, work, esperado, texto, modelo }) {
  if (!graders.length) return [];
  const prompt = [
    'Eres el juez de una eval. Decide, sólo con la evidencia de abajo, si cada afirmación es cierta.',
    'Responde ÚNICAMENTE con JSON: {"veredictos":[{"n":1,"aprobado":true|false,"evidencia":"cita o motivo breve"}]}.',
    'Si la evidencia no basta para afirmar algo, es false.',
    '', 'AFIRMACIONES:', ...graders.map((g, i) => `${i + 1}. ${g.texto}`),
    '', 'RESPUESTA FINAL DEL AGENTE:', texto || '(vacía)',
    '', `ARCHIVOS DEL DIRECTORIO DE TRABAJO:\n${listFiles(work).join('\n')}`,
    '', `CONTENIDO DEL FOLDER ${esperado.carpeta}:`, folderDump(join(work, esperado.carpeta)),
  ].join('\n');
  const args = ['-p', '--output-format', 'json', '--max-turns', '1', '--disallowedTools', 'Bash', 'Write', 'Edit', 'WebSearch', 'WebFetch', 'Skill'];
  if (modelo) args.push('--model', modelo);
  const r = await run('claude', args, { cwd: work, input: prompt, timeoutMs: 300_000 });
  let text = '';
  try { text = JSON.parse(r.stdout).result ?? ''; } catch { text = r.stdout; }
  return veredictosDelJuez(text, graders);
}

function listFiles(dir, base = dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) listFiles(p, base, acc);
    else acc.push(relative(base, p).split(sep).join('/'));
  }
  return acc;
}

async function ejecutarCaso(caseDir, brazo, rep, opts, root) {
  const name = caseDir.split(sep).pop();
  const { settings, prompt } = parsePrompt(readFileSync(join(caseDir, 'prompt.md'), 'utf8'));
  const esperado = JSON.parse(readFileSync(join(caseDir, 'esperado.json'), 'utf8'));
  if (opts.umbral) esperado.umbral = opts.umbral;
  const work = join(root, 'trabajo', name, brazo, `rep-${rep}`);
  mkdirSync(work, { recursive: true });
  if (existsSync(join(caseDir, 'place-files.sh'))) {
    const s = await run('bash', [join(caseDir, 'place-files.sh').split(sep).join('/')], { cwd: work });
    if (s.code !== 0) throw new Error(`place-files.sh de ${name} falló: ${s.stderr}`);
  }
  const userPrompt = prompt.replace(/\n*Input files:.*$/s, '').trim();
  const t0 = Date.now();
  const res = opts.seco ? { code: 0, stdout: '', stderr: '', timedOut: false }
    : await run('claude', claudeArgs({ settings, conSkill: brazo === 'con_skill', modelo: opts.modelo }),
      { cwd: work, input: userPrompt, timeoutMs: (settings.timeout_seconds ?? 1800) * 1000 });
  const claude = parseStream(res.stdout);
  if (claude.duracion_ms == null) claude.duracion_ms = Date.now() - t0;
  if (res.timedOut) claude.error = 'timeout';
  else if (res.code !== 0 && !claude.error) claude.error = `exit ${res.code}: ${res.stderr.slice(0, 300)}`;
  const folder = join(work, esperado.carpeta);
  const evaluacion = existsSync(folder)
    ? evaluar(folder, esperado, { trabajo: work })
    : { puntuacion: 0, umbral: esperado.umbral ?? 0.85, aprobado: false, criticos_fallidos: ['carpeta'], checks: [
      { id: 'carpeta', categoria: 'estructura', peso: 1, valor: 0, aprobado: false, critico: true, detalle: `no se creó ${esperado.carpeta}` }] };
  const juez = opts.juez && !opts.seco ? await juzgar({ graders: parseGraders(join(caseDir, 'graders')), work, esperado, texto: claude.texto, modelo: opts.modeloJuez }) : null;
  writeFileSync(join(work, '..', `rep-${rep}.stream.jsonl`), res.stdout);
  return { caso: name, brazo, rep, trabajo: work, claude, evaluacion, juez };
}

async function pool(tasks, n) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.max(1, n) }, async () => {
    while (i < tasks.length) { const k = i++; results[k] = await tasks[k](); }
  }));
  return results;
}

function informe(runs, meta) {
  const s = resumen(runs);
  const f = (x, d = 3) => (x == null ? '—' : Number(x).toFixed(d));
  const L = [`# Evals de ${SKILL}`, '', `${meta.fecha} · modelo ${meta.modelo ?? 'por defecto'} · repeticiones ${meta.repeticiones}${meta.juez ? ' · con juez' : ''}`, '',
    '## Resumen', '', '| Brazo | Ejecuciones | Puntuación media | Aprobadas | Skill usada | Juez | Coste medio (USD) | Duración media (s) |', '|---|---|---|---|---|---|---|---|'];
  for (const arm of ['con_skill', 'sin_skill']) {
    const a = s[arm];
    if (!a.ejecuciones) continue;
    L.push(`| ${arm} | ${a.ejecuciones} | ${f(a.puntuacion)} | ${a.aprobadas}/${a.ejecuciones} | ${a.skill_usada}/${a.ejecuciones} | ${a.juez == null ? '—' : `${Math.round(a.juez * 100)} %`} | ${f(a.coste_usd, 2)} | ${f(a.duracion_s, 0)} |`);
  }
  if (s.delta_puntuacion != null) L.push('', `**Delta de puntuación (con − sin): ${s.delta_puntuacion >= 0 ? '+' : ''}${f(s.delta_puntuacion)}**`);
  L.push('', '## Por caso', '');
  for (const r of runs) {
    L.push(`### ${r.caso} · ${r.brazo} · rep ${r.rep}`, '',
      `Puntuación **${r.evaluacion.puntuacion}** → ${r.evaluacion.aprobado ? '✓ aprobado' : '✗ no aprobado'} · skill usada: ${r.claude.skill_usada ? 'sí' : 'no'}${r.claude.copia_local_usada ? ' · **contaminada: usó la copia local del skill**' : ''}${r.claude.skills.length ? ` (${r.claude.skills.join(', ')})` : ''} · turnos ${r.claude.turnos ?? '—'} · coste ${f(r.claude.coste_usd, 2)} USD${r.claude.error ? ` · **error: ${r.claude.error}**` : ''}`, '');
    const fails = r.evaluacion.checks.filter((c) => !c.aprobado);
    if (fails.length) { L.push('Comprobaciones que fallan:', ''); for (const c of fails) L.push(`- \`${c.id}\` (${c.valor}×${c.peso}${c.critico ? ', crítica' : ''}): ${c.detalle}`); L.push(''); }
    if (r.juez?.length) { L.push('Juez:', ''); for (const v of r.juez) L.push(`- ${v.aprobado ? '✓' : '✗'} ${v.texto} — ${v.evidencia}`); L.push(''); }
  }
  return L.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const opts = {
    caso: opt('--caso'), sinBase: args.includes('--sin-base'), repeticiones: Number(opt('--repeticiones') ?? 1),
    concurrencia: Number(opt('--concurrencia') ?? 1), modelo: opt('--modelo'), juez: args.includes('--juez'),
    modeloJuez: opt('--modelo-juez'), umbral: opt('--umbral') ? Number(opt('--umbral')) : undefined,
    mantener: args.includes('--mantener'), seco: args.includes('--seco'), salida: opt('--salida'),
  };
  if (!(opts.repeticiones >= 1) || !(opts.concurrencia >= 1)) { console.error('--repeticiones y --concurrencia deben ser ≥ 1'); process.exit(2); }
  const local = join(homedir(), '.claude', 'skills', SKILL);
  if (existsSync(local) && !args.includes('--permitir-copia-local')) {
    console.error(`Hay una copia del skill en ${local}. Se cargaría también en la línea base y contaminaría la comparación.\n` +
      'Quítala (el plugin la sustituye) o pasa --permitir-copia-local si sabes lo que haces.');
    process.exit(2);
  }
  const cases = discover(opts.caso);
  if (!cases.length) { console.error('No hay casos que coincidan.'); process.exit(2); }
  const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const root = join(tmpdir(), `${SKILL}-evals`, fecha);
  const arms = opts.sinBase ? ['con_skill'] : ['con_skill', 'sin_skill'];
  const tasks = cases.flatMap((c) => arms.flatMap((a) => Array.from({ length: opts.repeticiones }, (_, k) => () => {
    console.log(`▶ ${c.split(sep).pop()} · ${a} · rep ${k + 1}`);
    return ejecutarCaso(c, a, k + 1, opts, root).then((r) => {
      console.log(`  ${r.evaluacion.aprobado ? '✓' : '✗'} ${r.caso} · ${a} · ${r.evaluacion.puntuacion}${r.claude.error ? ` · ${r.claude.error}` : ''}`);
      return r;
    });
  })));
  const runs = await pool(tasks, opts.concurrencia);
  const out = opts.salida ? resolve(opts.salida) : join(HERE, 'resultados', fecha);
  mkdirSync(out, { recursive: true });
  const meta = { fecha, modelo: opts.modelo, repeticiones: opts.repeticiones, juez: opts.juez };
  writeFileSync(join(out, 'resultado.json'), JSON.stringify({ meta, resumen: resumen(runs), runs }, null, 2));
  writeFileSync(join(out, 'informe.md'), informe(runs, meta));
  if (!opts.mantener) rmSync(join(root, 'trabajo'), { recursive: true, force: true });
  console.log(`\nInforme: ${join(out, 'informe.md')}${opts.mantener ? `\nDirectorios de trabajo: ${join(root, 'trabajo')}` : ''}`);
  const s = resumen(runs);
  console.log(`con_skill: ${s.con_skill.aprobadas}/${s.con_skill.ejecuciones} aprobadas, media ${s.con_skill.puntuacion?.toFixed(3)}` +
    (s.sin_skill.ejecuciones ? ` · sin_skill: media ${s.sin_skill.puntuacion?.toFixed(3)} · delta ${s.delta_puntuacion >= 0 ? '+' : ''}${s.delta_puntuacion?.toFixed(3)}` : ''));
  process.exit(s.con_skill.aprobadas === s.con_skill.ejecuciones ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
