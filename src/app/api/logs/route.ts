import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

const EXCEL_PATH = path.resolve(process.cwd(), 'HRM_mini_vn_2025-2026.xlsx')
const SHEET = 'nhat-ky'

function readSheet<T = Record<string, unknown>>(wb: XLSX.WorkBook, sheetName: string): T[] {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<T>(ws, { defval: '' })
}

function writeSheet(wb: XLSX.WorkBook, sheetName: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    const ws = wb.Sheets[sheetName]
    if (!ws) return
    const ref = ws['!ref']
    if (!ref) return
    const range = XLSX.utils.decode_range(ref)
    for (let R = 1; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        delete ws[XLSX.utils.encode_cell({ r: R, c: C })]
      }
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: range.s, e: { r: 0, c: range.e.c } })
    return
  }
  const ws = XLSX.utils.json_to_sheet(rows)
  wb.Sheets[sheetName] = ws
  if (!wb.SheetNames.includes(sheetName)) {
    wb.SheetNames.push(sheetName)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action: string      // CREATE | UPDATE | DELETE | APPROVE | REJECT
      entity_type: string // nhan-vien | cham-cong | don-xin-nghi | phu-cap-khau-tru | bang-luong
      entity_id: string
      user: string
      description: string
    }

    if (!fs.existsSync(EXCEL_PATH)) {
      return NextResponse.json(
        { error: `Không tìm thấy file Excel tại: ${EXCEL_PATH}` },
        { status: 500 }
      )
    }

    const wb = XLSX.readFile(EXCEL_PATH)
    const existing = readSheet<any>(wb, SHEET)

    // Tạo ID mới
    const nums = existing.map((r: any) => parseInt(String(r.log_id ?? '').replace(/\D/g, '') || '0'))
    const newId = `LOG-${String(Math.max(0, ...nums) + 1).padStart(6, '0')}`

    const newRow = {
      log_id: newId,
      log_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: body.user ?? 'admin',
      action: body.action,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      description: body.description,
    }

    existing.push(newRow)

    writeSheet(wb, SHEET, existing)
    XLSX.writeFile(wb, EXCEL_PATH)

    return NextResponse.json({ ok: true, log_id: newId })
  } catch (err: any) {
    console.error('[API/logs POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
