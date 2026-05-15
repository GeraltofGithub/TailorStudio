import { Schema } from 'mongoose'
import { defineModel, schemaOpts } from './helpers.js'

const schema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ['OWNER', 'STAFF'], required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    enabled: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    inviteNote: String,
    sessionEpoch: { type: Number, default: 0 },
  },
  { collection: 'users', ...schemaOpts },
)

export const User = defineModel('User', schema)

export type UserDoc = {
  id: string
  email: string
  passwordHash: string
  fullName: string
  role: 'OWNER' | 'STAFF'
  businessId: string
}

export function userFromLean(raw: Record<string, unknown>): UserDoc {
  return {
    id: String(raw._id),
    email: String(raw.email),
    passwordHash: String(raw.passwordHash),
    fullName: String(raw.fullName),
    role: raw.role as 'OWNER' | 'STAFF',
    businessId: String(raw.businessId),
  }
}
