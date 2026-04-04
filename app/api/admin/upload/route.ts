import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { requireWriteAccess } from '@/lib/auth/session'
import { s3Bucket, s3Client, s3PublicUrl } from '@/lib/minio'

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'])

export async function POST(request: NextRequest) {
  await requireWriteAccess()

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
  }

  const objectName = `products/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: objectName,
      Body: buffer,
      ContentType: file.type,
    }))
  } catch (err) {
    return NextResponse.json({ error: 'Upload failed', detail: String(err) }, { status: 500 })
  }

  const url = `${s3PublicUrl}/${s3Bucket}/${objectName}`
  return NextResponse.json({ url })
}
