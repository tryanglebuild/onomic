import { describe, expect, it } from 'vitest'
import { generateInviteToken, verifyInviteToken } from '@/lib/workspaces/invite-token'

const SECRET = 'test-secret-do-not-use-in-prod'

describe('invite-token', () => {
  it('round-trips a valid token', () => {
    const payload = { inviteId: '11111111-1111-1111-1111-111111111111', expiresAt: Date.now() + 60_000 }
    const token = generateInviteToken(payload, SECRET)

    const decoded = verifyInviteToken(token, SECRET)

    expect(decoded).toEqual(payload)
  })

  it('rejects a token signed with a different secret', () => {
    const payload = { inviteId: '11111111-1111-1111-1111-111111111111', expiresAt: Date.now() + 60_000 }
    const token = generateInviteToken(payload, SECRET)

    expect(() => verifyInviteToken(token, 'wrong-secret')).toThrow('invalid_signature')
  })

  it('rejects a tampered token', () => {
    const payload = { inviteId: '11111111-1111-1111-1111-111111111111', expiresAt: Date.now() + 60_000 }
    const token = generateInviteToken(payload, SECRET)
    const tampered = token.slice(0, -1) + (token.at(-1) === 'a' ? 'b' : 'a')

    expect(() => verifyInviteToken(tampered, SECRET)).toThrow('invalid_signature')
  })

  it('rejects an expired token', () => {
    const payload = { inviteId: '11111111-1111-1111-1111-111111111111', expiresAt: Date.now() - 1000 }
    const token = generateInviteToken(payload, SECRET)

    expect(() => verifyInviteToken(token, SECRET)).toThrow('token_expired')
  })

  it('rejects a malformed token', () => {
    expect(() => verifyInviteToken('not-a-real-token', SECRET)).toThrow('invalid_token_format')
  })
})
