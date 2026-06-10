import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { freshHome, cleanupHome } from '../testUtils.js';
import { executeTool, ToolDef } from './registerTool.js';
import { HumanifyError } from './errors.js';

beforeEach(freshHome);
afterEach(cleanupHome);

const echoTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'echo',
  description: 'test',
  inputSchema: z.object({ value: z.string() }).strict(),
  outputSchema: z.object({ value: z.string() }),
  handler: (input: { value: string }) => ({ value: input.value }),
};

describe('tool execution framework', () => {
  it('passes valid input through', async () => {
    await expect(executeTool(echoTool, { value: 'hi' })).resolves.toEqual({ value: 'hi' });
  });

  it('rejects unknown input fields with BAD_INPUT', async () => {
    try {
      await executeTool(echoTool, { value: 'hi', extra: 1 });
      expect.unreachable();
    } catch (err) {
      expect((err as HumanifyError).code).toBe('BAD_INPUT');
    }
  });

  it('rejects missing fields with BAD_INPUT', async () => {
    try {
      await executeTool(echoTool, {});
      expect.unreachable();
    } catch (err) {
      expect((err as HumanifyError).code).toBe('BAD_INPUT');
    }
  });

  it('maps a generic thrown Error to PROVIDER_ERROR without stack leakage', async () => {
    const failing: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
      ...echoTool,
      handler: () => {
        throw new Error('whatever');
      },
    };
    try {
      await executeTool(failing, { value: 'hi' });
      expect.unreachable();
    } catch (err) {
      const he = err as HumanifyError;
      expect(he.code).toBe('PROVIDER_ERROR');
      expect(he.message).toBe('whatever');
    }
  });

  it('preserves HumanifyError codes from handlers', async () => {
    const failing: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
      ...echoTool,
      handler: () => {
        throw new HumanifyError('RATE_LIMITED', 'slow down', true);
      },
    };
    try {
      await executeTool(failing, { value: 'hi' });
      expect.unreachable();
    } catch (err) {
      expect((err as HumanifyError).code).toBe('RATE_LIMITED');
    }
  });
});
