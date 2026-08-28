import { createRequire } from 'node:module';
import { handlePhase4 } from '../src/server/phase4Api.ts';

const require = createRequire(import.meta.url);
const serverModule = require('../dist/server.cjs');
const app = serverModule.default || serverModule;

export default async function handler(req: any, res: any) {
  const rawPath = req.query?.path;
  const path = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '').replace(/^\/+/, '');

  if (
    path.startsWith('push/') ||
    path === 'reminders' ||
    path.startsWith('reminders/') ||
    path === 'notification-preferences'
  ) {
    const handled = await handlePhase4(req, res, path);
    if (handled) return;
  }

  if (req.query && Object.prototype.hasOwnProperty.call(req.query, 'path')) delete req.query.path;

  const query = new URLSearchParams();
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) for (const item of value) query.append(key, String(item));
      else if (value !== undefined && value !== null) query.set(key, String(value));
    }
  }

  req.url = `/api${path ? `/${path}` : ''}${query.toString() ? `?${query.toString()}` : ''}`;
  return app(req, res);
}
