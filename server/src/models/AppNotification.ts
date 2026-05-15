import { Schema, Types } from 'mongoose'
import { defineModel, schemaOpts } from './helpers.js'

const schema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
    message: String,
    orderId: { type: Schema.Types.ObjectId, ref: 'TailorOrder' },
    readFlag: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'notifications', ...schemaOpts },
)

export const AppNotification = defineModel('AppNotification', schema)
