import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { Business, User } from '../models/index.js'
import { parseObjectId } from '../utils/objectId.js'

const joinCode = () => crypto.randomBytes(8).toString('hex').toUpperCase()

export async function registerStudio(body: {
  businessName: string
  tagline?: string | null
  address?: string | null
  phone?: string | null
  secondaryPhone?: string | null
  ownerName: string
  email: string
  password: string
}) {
  const em = body.email.trim().toLowerCase()
  if (await User.findOne({ email: em })) throw new Error('Email already registered')
  const business = await Business.create({
    name: body.businessName,
    tagline: body.tagline || null,
    address: body.address || null,
    phone: body.phone || null,
    secondaryPhone: body.secondaryPhone || null,
    joinCode: joinCode(),
  })
  await User.create({
    email: em,
    passwordHash: await bcrypt.hash(body.password, 10),
    fullName: body.ownerName,
    role: 'OWNER',
    businessId: business._id,
  })
}

export async function registerStaff(body: {
  joinCode: string
  fullName: string
  email: string
  password: string
}) {
  const em = body.email.trim().toLowerCase()
  if (await User.findOne({ email: em })) throw new Error('Email already registered')
  const b = await Business.findOne({ joinCode: body.joinCode.trim() }).lean()
  if (!b) throw new Error('Invalid studio code')
  await User.create({
    email: em,
    passwordHash: await bcrypt.hash(body.password, 10),
    fullName: body.fullName,
    role: 'STAFF',
    businessId: b._id,
    inviteNote: 'Joined with studio code',
  })
}

export async function rotateJoinCode(businessId: string) {
  const code = joinCode()
  await Business.updateOne({ _id: parseObjectId(businessId) }, { $set: { joinCode: code } })
  return code
}

export async function updatePasswordForUser(userId: string, password: string) {
  await User.updateOne({ _id: parseObjectId(userId) }, { $set: { passwordHash: await bcrypt.hash(password, 10) } })
}
