import mongoose, { Schema } from 'mongoose'

const schema = new Schema(
  {
    email: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    tokenHash: { type: String, index: true },
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'pending_logins', versionKey: false },
)
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const PendingLogin = mongoose.models.PendingLogin || mongoose.model('PendingLogin', schema)
