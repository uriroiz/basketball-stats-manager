import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.39.0'

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'https://basketball-stats-manager.vercel.app',
]

function allowedOrigins(): Set<string> {
  const configured = Deno.env.get('ALLOWED_ORIGINS')
  return new Set(
    configured
      ? configured.split(',').map(value => value.trim()).filter(Boolean)
      : DEFAULT_ALLOWED_ORIGINS,
  )
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }

  if (origin && allowedOrigins().has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

export function preflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null
  const origin = req.headers.get('origin')
  if (origin && !allowedOrigins().has(origin)) {
    return jsonResponse(req, { error: 'Origin not allowed' }, 403)
  }
  return new Response(null, { status: 204, headers: corsHeaders(req) })
}

export function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  requirePost(req)
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json')
  }
  const contentLength = Number(req.headers.get('content-length') || 0)
  if (contentLength > 1_000_000) throw new HttpError(413, 'Request body is too large')

  const reader = req.body?.getReader()
  if (!reader) throw new HttpError(400, 'JSON body required')
  const chunks: Uint8Array[] = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    if (received > 1_000_000) {
      await reader.cancel()
      throw new HttpError(413, 'Request body is too large')
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  let value: unknown
  try {
    value = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new HttpError(400, 'Malformed JSON')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'JSON object required')
  }
  return value as Record<string, unknown>
}

export function requirePost(req: Request): void {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
}

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

export interface AdminContext {
  user: User
  userClient: SupabaseClient
  adminClient: SupabaseClient
}

export async function authorizeAdmin(req: Request): Promise<AdminContext> {
  const authorization = req.headers.get('authorization') || ''
  if (!authorization.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication required')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new HttpError(500, 'Server authentication is not configured')
  }

  const token = authorization.slice('Bearer '.length)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await userClient.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'Invalid session')
  if (data.user.app_metadata?.role !== 'admin') {
    throw new HttpError(403, 'Administrator role required')
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return { user: data.user, userClient, adminClient }
}

export function errorResponse(req: Request, error: unknown): Response {
  if (error instanceof HttpError) {
    return jsonResponse(req, { error: error.message }, error.status)
  }
  console.error('Unhandled Edge Function error:', error)
  return jsonResponse(req, { error: 'Internal server error' }, 500)
}

export function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${field} must be an object`)
  }
  return value as Record<string, unknown>
}

export function requireIdentifier(value: unknown, field: string): string | number {
  if (typeof value === 'string' && value.trim() && value.length <= 128) return value
  if (Number.isInteger(value)) return value as number
  throw new HttpError(400, `${field} is required`)
}

export function pickFields(
  record: Record<string, unknown>,
  allowedFields: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(
    allowedFields.filter(field => Object.hasOwn(record, field)).map(field => [field, record[field]]),
  )
}
