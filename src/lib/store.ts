/**
 * HRM - Store v2
 * Đọc/ghi dữ liệu trực tiếp từ file Excel thông qua API route /api/data.
 * Dùng localStorage làm cache để tránh gọi API liên tục.
 */

import type { AppData } from './types'

const CACHE_KEY = 'hrm-pro-cache-v2'
const CACHE_TTL_MS = 60_000 // cache 60 giây

// ── Cache helpers ─────────────────────────────────────────────────────────────

interface CacheEntry {
  data: AppData
  ts: number
}

function readCache(): AppData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null // expired
    return entry.data
  } catch {
    return null
  }
}

function writeCache(data: AppData) {
  if (typeof window === 'undefined') return
  try {
    const entry: CacheEntry = { data, ts: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {}
}

function clearCache() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(CACHE_KEY) } catch {}
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** Lấy toàn bộ dữ liệu từ Excel (có cache 60s) */
export async function fetchData(forceRefresh = false): Promise<AppData> {
  if (!forceRefresh) {
    const cached = readCache()
    if (cached) return cached
  }
  const res = await fetch('/api/data', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Lỗi đọc dữ liệu: ${res.status}`)
  const data: AppData = await res.json()
  writeCache(data)
  return data
}

/** Ghi 1 slice dữ liệu (1 sheet) vào Excel */
async function saveSheet(sheet: string, rows: unknown[]) {
  clearCache() // invalidate cache
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet, rows }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Lỗi ghi sheet "${sheet}"`)
  }
  return res.json()
}

// ── Per-sheet save functions ──────────────────────────────────────────────────

export const saveAttendances  = (rows: unknown[]) => saveSheet('attendances', rows)
export const saveEmployees    = (rows: unknown[]) => saveSheet('employees', rows)
export const saveLeaveRequests = (rows: unknown[]) => saveSheet('leaveRequests', rows)
export const saveAdjustments  = (rows: unknown[]) => saveSheet('adjustments', rows)
export const savePayrolls     = (rows: unknown[]) => saveSheet('payrolls', rows)
export const saveDepartments  = (rows: unknown[]) => saveSheet('departments', rows)
export const savePositions    = (rows: unknown[]) => saveSheet('positions', rows)
export const saveShifts       = (rows: unknown[]) => saveSheet('shifts', rows)
export const saveSettings     = (rows: unknown[]) => saveSheet('settings', rows)

// ── Activity Log ───────────────────────────────────────────────────────────────

export type LogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT'
export type EntityType = 'nhan-vien' | 'cham-cong' | 'don-xin-nghi' | 'phu-cap-khau-tru' | 'bang-luong' | 'phong-ban' | 'chuc-vu' | 'ca-lam-viec' | 'bang-gia-tri' | 'cai-dat'

/**
 * Ghi 1 dòng nhật ký vào sheet nhat-ky trong Excel.
 * Fire-and-forget — không cần await, không chặn luồng chính.
 */
export function logActivity(
  action: LogAction,
  entity_type: EntityType,
  entity_id: string,
  description: string,
  user = 'admin'
) {
  // Ghi ngay không chờ, không làm chậm UI
  fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, entity_type, entity_id, user, description }),
  }).catch(err => console.warn('[logActivity]', err))
}

// ── Legacy sync API (dùng cho Sidebar export) ─────────────────────────────────
/** Đọc từ cache nếu có (không await), fallback rỗng */
export function loadData(): AppData {
  // Trả về empty structure; UI sẽ dùng fetchData() async để load thực
  return readCache() ?? {
    employees: [], attendances: [], leaveRequests: [],
    adjustments: [], payrolls: [], departments: [],
    positions: [], shifts: [], settings: [], logs: [], enumValues: [],
  }
}

/** Không dùng nữa — giữ compatible */
export function saveData(_data: AppData) {}
export function resetData(): AppData { return loadData() }
