import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { requireWriteAccess } from '@/features/auth'
import { getStoreId } from '@/lib/config/tenant'
import { problemResponse } from '@/lib/api/problem-response'
import { internalProblem } from '@/lib/problems'
import { ProblemType } from '@/lib/types/problem-detail'
import { s3Bucket, s3Client, s3PublicUrl } from '@/features/media'

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'])

function badRequest(detail: string) {
  return problemResponse({
    type: ProblemType.VALIDATION_ERROR,
    status: 400,
    title: "Bad request",
    detail,
  });
}

export async function POST(request: NextRequest) {
  await requireWriteAccess()

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return badRequest('No file provided')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return badRequest('File type not allowed')
  }

  if (!file.type.startsWith('image/')) {
    return badRequest('Only image files are allowed')
  }

  const storeId = getStoreId()
  const objectName = `${storeId}/products/${randomUUID()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: objectName,
      Body: buffer,
      ContentType: file.type,
    }))
  } catch {
    return problemResponse(internalProblem('Upload failed'))
  }

  const url = `${s3PublicUrl}/${s3Bucket}/${objectName}`
  return NextResponse.json({ url })
}
