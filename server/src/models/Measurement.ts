import { Schema, Types } from 'mongoose'
import { defineModel, schemaOpts } from './helpers.js'

const schema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    garmentType: String,
    dataJson: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'measurements', ...schemaOpts },
)

export const Measurement = defineModel('Measurement', schema)
