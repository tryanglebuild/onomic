import { createHmac, timingSafeEqual } from 'node:crypto'

export interface InviteTokenPayload {
  inviteId: string
  expiresAt: number
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function generateInviteToken(payload: InviteTokenPayload, secret: string): string {
  const data = `${payload.inviteId}.${payload.expiresAt}`
  const signature = sign(data, secret)
  return `${Buffer.from(data).toString('base64url')}.${signature}`
}

export function verifyInviteToken(token: string, secret: string): InviteTokenPayload {
  const parts = token.split('.')
  if (parts.length !== 2) {
    throw new Error('invalid_token_format')
  }

  const [encodedData, signature] = parts
  const data = Buffer.from(encodedData, 'base64url').toString('utf8')
  const expectedSignature = sign(data, secret)

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('invalid_signature')
  }

  const [inviteId, expiresAtStr] = data.split('.')
  const expiresAt = Number(expiresAtStr)

  if (!inviteId || Number.isNaN(expiresAt)) {
    throw new Error('invalid_token_format')
  }

  if (Date.now() > expiresAt) {
    throw new Error('token_expired')
  }

  return { inviteId, expiresAt }
}
