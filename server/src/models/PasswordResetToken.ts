import mongoose, { Schema } from 'mongoose'

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    tokenHash: { type: String, index: true },
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'password_reset_tokens', versionKey: false },
)
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const PasswordResetToken =
  mongoose.models.PasswordResetToken || mongoose.model('PasswordResetToken', schema)
