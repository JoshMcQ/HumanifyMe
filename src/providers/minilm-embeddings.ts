// Optional local-neural embedder via transformers.js MiniLM (M8, opt-in behind
// rag.embedder). Runs fully on-device. The library is NOT a dependency of the
// package — it is imported lazily through a non-literal specifier so the bundler
// never tries to resolve it and the default install stays light. If the user
// selects this embedder without installing the lib, they get a clear message.

import { EmbeddingProvider } from './embeddings.js';
import { HumanifyError } from '../mcp/errors.js';

type Extractor = (text: string, opts: unknown) => Promise<{ data: Float32Array | number[] }>;
type TransformersModule = {
  pipeline: (task: string, model: string) => Promise<Extractor>;
};

export class MiniLmEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'minilm:all-MiniLM-L6-v2';
  readonly dim = 384;
  private extractor: Extractor | null = null;

  private async getExtractor(): Promise<Extractor> {
    if (this.extractor) return this.extractor;
    // Non-literal specifier: the bundler leaves this as a runtime import, so the
    // missing optional package never breaks the build or the default path.
    const spec = '@huggingface/transformers';
    let mod: TransformersModule;
    try {
      mod = (await import(spec)) as TransformersModule;
    } catch {
      throw new HumanifyError(
        'PROVIDER_ERROR',
        'rag.embedder is "minilm" but @huggingface/transformers is not installed. Run `npm i @huggingface/transformers`, or set rag.embedder back to "lexical".',
      );
    }
    this.extractor = await mod.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    return this.extractor;
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    const extractor = await this.getExtractor();
    const out: Float32Array[] = [];
    for (const text of texts) {
      const res = await extractor(text, { pooling: 'mean', normalize: true });
      out.push(Float32Array.from(res.data));
    }
    return out;
  }
}
