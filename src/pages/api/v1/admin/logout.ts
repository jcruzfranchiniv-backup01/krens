import type { APIRoute } from 'astro';
import { endSession, jsonResponse, requireAdmin } from '../../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const session = await requireAdmin(context);
  if (session instanceof Response) return session;
  await endSession(context.cookies);
  return jsonResponse(200, { ok: true });
};
