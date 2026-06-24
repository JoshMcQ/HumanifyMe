// Structural guard for the alpha survey (default vitest suite; no browser).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, 'alpha-survey.html'), 'utf8');

describe('alpha-survey.html', () => {
  it('asks the five questions', () => {
    for (const q of ['1.', '2.', '3.', '4.', '5.']) expect(html).toContain(`>${q}<`);
  });

  it('Q1 maps to sounds-like-me values', () => {
    for (const v of ['y', 'kinda', 'n']) expect(html).toContain(`data-v="${v}"`);
  });

  it('posts to /api/feedback with source survey', () => {
    expect(html).toContain("var API='/api/feedback'");
    expect(html).toContain("source:'survey'");
    expect(html).toContain('soundsLikeMe:state.q1');
    expect(html).toContain('recommend:state.q4');
  });

  it('is excluded from search indexing (alpha-only)', () => {
    expect(html).toContain('name="robots" content="noindex"');
  });
});

describe('alpha-cohort-email template', () => {
  it('links the survey and is marked draft (no-send guardrail)', () => {
    const md = fs.readFileSync(path.join(here, '..', 'tasks', 'alpha-cohort-email.md'), 'utf8');
    expect(md).toContain('https://humanifyme.com/alpha-survey.html');
    expect(md.toUpperCase()).toContain('DRAFT');
  });
});
