import { Schema, Types } from 'mongoose'
import { defineModel, schemaOpts } from './helpers.js'

const schema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    serialNumber: Number,
    displayId: String,
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: String,
    preferredUnit: { type: String, enum: ['INCH', 'CM'], default: 'INCH' },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'customers', ...schemaOpts },
)

export const Customer = defineModel('Customer', schema)
