import mongoose, { Schema } from 'mongoose'

const schema = new Schema(
  {
    email: { type: String, index: true },
    purpose: { type: String, enum: ['LOGIN', 'PASSWORD_RESET'] },
    codeHash: String,
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'otp_challenges', versionKey: false },
)
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const OtpChallenge = mongoose.models.OtpChallenge || mongoose.model('OtpChallenge', schema)
