import { BUILD_ENV } from './build-env.generated';

// Imported first by worker/index.ts, so lib/site.ts and lib/reserve.ts read these when they load, exactly as the code
// Next.js builds sees the values it inlined at build time. Server-only settings such as RPC_URL stay runtime secrets.
for (const [name, value] of Object.entries(BUILD_ENV)) {
  if (value === null) delete process.env[name];
  else process.env[name] = value;
}
