import { createSigner, createVerifier } from 'fast-jwt'
import { cfg } from '../config.js'

// ── Signers ────────────────────────────────────────────────────────────────────
export const signAccess = createSigner({
  key: cfg.jwtAccessSecret,
  expiresIn: 15 * 60 * 1000,         // 15 minutes
  algorithm: 'HS256',
})

export const signRefresh = createSigner({
  key: cfg.jwtRefreshSecret,
  expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
  algorithm: 'HS256',
})

// ── Verifiers ──────────────────────────────────────────────────────────────────
export const verifyAccess = createVerifier({
  key: cfg.jwtAccessSecret,
  algorithms: ['HS256'],
})

export const verifyRefresh = createVerifier({
  key: cfg.jwtRefreshSecret,
  algorithms: ['HS256'],
})

// ── Token payload types ────────────────────────────────────────────────────────
export interface TokenPayload {
  sub: string   // userId
  email: string
  role: string  // 'USER' | 'ADMIN'
  type: 'access' | 'refresh'
}
