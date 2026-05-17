import { Schema, Types } from 'mongoose'
import { defineModel, schemaOpts } from './helpers.js'

const lineSchema = new Schema(
  { description: String, rate: Number, amount: Number },
  { _id: false },
)

const schema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    serialNumber: Number,
    displayId: String,
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    garmentType: String,
    measurementSnapshotJson: String,
    orderDate: String,
    deliveryDate: String,
    status: { type: String, default: 'PENDING' },
    totalAmount: { type: Number, default: 0 },
    advanceAmount: { type: Number, default: 0 },
    notes: String,
    materialsNotes: String,
    demandsNotes: String,
    lines: [lineSchema],
    createdAt: { type: Date, default: Date.now },
    deliveredAt: Date,
    paidInFullAt: Date,
    lastPaymentMethod: { type: String, default: 'NONE' },
    phonePeMerchantOrderId: String,
  },
  { collection: 'orders', ...schemaOpts },
)

schema.index({ businessId: 1, createdAt: -1 })

export const TailorOrder = defineModel('TailorOrder', schema)
