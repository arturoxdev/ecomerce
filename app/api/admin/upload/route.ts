import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { s3Bucket, s3Client, s3PublicUrl } from '@/lib/minio'

export async function POST(request: NextRequest) {
  console.log('[upload] POST request received')

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    console.log('[upload] No file in formData')
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  console.log('[upload] File received:', { name: file.name, type: file.type, size: file.size })

  const ext = file.name.split('.').pop() ?? 'bin'
  const objectName = `products/${randomUUID()}.${ext}`

  console.log('[upload] S3 config:', {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: s3Bucket,
    publicUrl: s3PublicUrl,
    objectName,
  })

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const result = await s3Client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: objectName,
      Body: buffer,
      ContentType: file.type,
    }))
    console.log('[upload] PutObjectCommand success:', result)
  } catch (err) {
    console.error('[upload] PutObjectCommand failed:', err)
    return NextResponse.json({ error: 'Upload failed', detail: String(err) }, { status: 500 })
  }

  const url = `${s3PublicUrl}/${s3Bucket}/${objectName}`
  console.log('[upload] Upload complete, url:', url)
  return NextResponse.json({ url })
}
