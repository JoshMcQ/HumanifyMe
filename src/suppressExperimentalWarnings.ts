// Must be imported before the SQLite driver loads (the driver is also
// require()d lazily in storage/db.ts because bundlers hoist static externals
// above all module code). Node prints warnings via an internal handler that
// ignores userland 'warning' listeners, so the only runtime interception
// point is process.emitWarning. We drop ONLY ExperimentalWarning -- the
// node:sqlite API surface we use is documented and pinned by our test suite.
// Every other warning passes through untouched.

const original = process.emitWarning.bind(process);

process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  const typeArg = args[0];
  const type =
    typeof typeArg === 'string'
      ? typeArg
      : typeArg && typeof typeArg === 'object'
        ? (typeArg as { type?: string }).type
        : undefined;
  const name = warning instanceof Error ? warning.name : undefined;
  if (type === 'ExperimentalWarning' || name === 'ExperimentalWarning') return;
  return original(warning as never, ...(args as never[]));
}) as typeof process.emitWarning;

export {};
