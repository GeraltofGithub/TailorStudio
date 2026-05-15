import mongoose, { type Schema } from 'mongoose'

const jsonOpts = {
  virtuals: true,
  versionKey: false,
  transform(_d: unknown, ret: Record<string, unknown>) {
    delete ret.mongoObjectId
    delete ret.id
    if (ret._id != null) ret.id = String(ret._id)
    delete ret._id
    delete ret.passwordHash
    return ret
  },
}

export const schemaOpts = { toJSON: jsonOpts, toObject: jsonOpts }

/** Re-register after schema changes (nodemon). */
export function defineModel<T>(name: string, schema: Schema) {
  if (mongoose.models[name]) delete mongoose.models[name]
  return mongoose.model<T>(name, schema)
}
