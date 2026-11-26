// Las piezas del runner que no llaman a claude, y el pipeline completo en modo --seco.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parsePrompt, parseGraders, parseStream, claudeArgs, veredictosDelJuez, resumen } from '../correr.mjs';

const EVALS = join(dirname(fileURLToPath(import.meta.url)), '..');

test('parsePrompt separa los ajustes del prompt', () => {
  const { settings, prompt } = parsePrompt('---\nmax_turns: 80\nallowed_tools: [Read, Bash]\ntags: [a]\n---\n\nhaz esto\n');
  assert.deepEqual(settings, { max_turns: 80, allowed_tools: ['Read', 'Bash'], tags: ['a'] });
  assert.equal(prompt, 'haz esto');
});

test('cada caso con esperado.json tiene prompt, graders y un esperado legible', () => {
  const cases = readdirSync(EVALS).filter((d) => existsSync(join(EVALS, d, 'esperado.json')));
  assert.ok(cases.length >= 5, `sólo ${cases.length} casos`);
  for (const c of cases) {
    const esperado = JSON.parse(readFileSync(join(EVALS, c, 'esperado.json'), 'utf8'));
    assert.ok(esperado.carpeta, `${c}: falta carpeta`);
    assert.ok(parsePrompt(readFileSync(join(EVALS, c, 'prompt.md'), 'utf8')).prompt.length > 20, `${c}: prompt vacío`);
    assert.ok(parseGraders(join(EVALS, c, 'graders')).length >= 3, `${c}: menos de 3 graders semánticos`);
    for (const p of [...(esperado.descartes ?? []), ...(esperado.prohibidos ?? []), ...(esperado.conceptos ?? [])]) new RegExp(p.patron, 'iu');
  }
});

test('parseStream detecta el uso del skill, el coste y los tokens', () => {
  const lines = [
    JSON.stringify({ type: 'system', subtype: 'init', skills: ['investigacion-arquitectura:investigacion-arquitectura'] }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'investigacion-arquitectura:investigacion-arquitectura' } }] } }),
    'texto suelto que no es JSON',
    JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'hecho', total_cost_usd: 1.5, duration_ms: 1000, num_turns: 7,
      usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 30, cache_creation_input_tokens: 40 } }),
  ].join('\n');
  const r = parseStream(lines);
  assert.equal(r.skill_usada, true);
  assert.equal(r.plugin_cargado, true);
  assert.equal(r.copia_local_cargada, false);
  assert.equal(r.texto, 'hecho');
  assert.equal(r.coste_usd, 1.5);
  assert.equal(r.turnos, 7);
  assert.equal(r.tokens, 100);
  assert.equal(parseStream(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'otra' } }] } })).skill_usada, false);
  // La copia local con el mismo nombre no cuenta como uso del plugin: se marca como contaminación.
  const local = parseStream(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'investigacion-arquitectura' } }] } }));
  assert.equal(local.skill_usada, false);
  assert.equal(local.copia_local_usada, true);
});

test('claudeArgs carga el plugin sólo en el brazo con skill y bloquea los skills en la línea base', () => {
  const settings = { max_turns: 5, allowed_tools: ['Read', 'Write'] };
  const con = claudeArgs({ settings, conSkill: true, modelo: 'sonnet' });
  const sin = claudeArgs({ settings, conSkill: false });
  assert.ok(con.includes('--plugin-dir') && !con.includes('--disallowedTools'));
  assert.ok(!sin.includes('--plugin-dir') && sin[sin.indexOf('--disallowedTools') + 1] === 'Skill');
  assert.equal(con[con.indexOf('--model') + 1], 'sonnet');
  assert.equal(con[con.indexOf('--max-turns') + 1], '5');
});

test('veredictosDelJuez lee el JSON y es estricto con respuestas inválidas', () => {
  const g = [{ texto: 'a' }, { texto: 'b' }];
  const ok = veredictosDelJuez('Aquí va: {"veredictos":[{"n":1,"aprobado":true,"evidencia":"x"},{"n":2,"aprobado":false,"evidencia":"y"}]}', g);
  assert.deepEqual(ok.map((v) => v.aprobado), [true, false]);
  assert.deepEqual(veredictosDelJuez('no sé', g).map((v) => v.aprobado), [false, false]);
});

test('resumen calcula medias por brazo y el delta', () => {
  const r = (brazo, p, ok) => ({ brazo, evaluacion: { puntuacion: p, aprobado: ok }, claude: { skill_usada: brazo === 'con_skill', coste_usd: 1, duracion_ms: 2000 }, juez: null });
  const s = resumen([r('con_skill', 0.9, true), r('con_skill', 0.8, false), r('sin_skill', 0.5, false)]);
  assert.equal(s.con_skill.aprobadas, 1);
  assert.ok(Math.abs(s.con_skill.puntuacion - 0.85) < 1e-9);
  assert.ok(Math.abs(s.delta_puntuacion - 0.35) < 1e-9);
});

test('el pipeline en modo --seco prepara el caso, lo evalúa y escribe el informe', () => {
  const out = mkdtempSync(join(tmpdir(), 'ia-seco-'));
  try {
    const r = spawnSync(process.execPath, [join(EVALS, 'correr.mjs'), '--seco', '--caso', 'comparar-sistema', '--sin-base', '--permitir-copia-local', '--salida', out], { encoding: 'utf8' });
    assert.ok([0, 1].includes(r.status), r.stderr);
    const res = JSON.parse(readFileSync(join(out, 'resultado.json'), 'utf8'));
    const run = res.runs[0];
    assert.equal(run.caso, 'comparar-sistema');
    // Sin agente no hay comparación, pero el fixture se copió intacto: los IDs y el código del sistema se conservan.
    const c = (id) => run.evaluacion.checks.find((x) => x.id === id);
    assert.equal(c('esperado.ids-preservados').aprobado, true);
    assert.equal(c('esperado.intactos').aprobado, true);
    assert.equal(c('esperado.comparacion').valor, 0);
    assert.match(readFileSync(join(out, 'informe.md'), 'utf8'), /comparar-sistema · con_skill/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
