import { Schema } from 'mongoose'
import { defineModel, schemaOpts } from './helpers.js'

const schema = new Schema(
  {
    name: { type: String, required: true },
    tagline: String,
    address: String,
    phone: String,
    secondaryPhone: String,
    joinCode: { type: String, unique: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'businesses', ...schemaOpts },
)

export const Business = defineModel('Business', schema)
