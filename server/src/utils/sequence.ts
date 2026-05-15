import mongoose from 'mongoose'

const Seq = mongoose.model(
  'Sequence',
  new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false }),
  'sequences',
)

export async function nextSeq(key: string): Promise<number> {
  const r = await Seq.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean()
  return r!.seq as number
}
