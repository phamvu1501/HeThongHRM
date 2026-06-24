import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()


export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action: string      // CREATE | UPDATE | DELETE | APPROVE | REJECT
      entity_type: string // nhan-vien | cham-cong | don-xin-nghi | phu-cap-khau-tru | bang-luong
      entity_id: string
      user: string
      description: string
    }

    // Generate new ID using Prisma aggregate
    const lastLog = await prisma.systemLog.findFirst({
      orderBy: { log_id: 'desc' }
    })
    
    let nextNum = 1
    if (lastLog) {
      const match = lastLog.log_id.match(/\d+/)
      if (match) {
        nextNum = parseInt(match[0]) + 1
      }
    }
    const newId = `LOG-${String(nextNum).padStart(6, '0')}`
    const logTime = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // 1. Lưu Postgres
    await prisma.systemLog.create({
      data: {
        log_id: newId,
        log_time: logTime,
        user: body.user ?? 'admin',
        action: body.action,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        description: body.description,
      }
    })

    return NextResponse.json({ ok: true, log_id: newId })
  } catch (err: any) {
    console.error('[API/logs POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
