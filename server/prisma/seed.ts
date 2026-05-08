import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ג”€ג”€ Helpers ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€

function ils(shekels: number) { return shekels * 100 }  // convert ג‚× to agorot

/** Working hours Sunג€“Thu 09:00ג€“20:00, Fri 09:00ג€“14:00, Sat closed */
async function seedWorkingHours(stylistId: string) {
  const days = [
    { dayOfWeek: 0, openTime: '09:00', closeTime: '20:00', isClosed: false }, // Sun
    { dayOfWeek: 1, openTime: '09:00', closeTime: '20:00', isClosed: false }, // Mon
    { dayOfWeek: 2, openTime: '09:00', closeTime: '20:00', isClosed: false }, // Tue
    { dayOfWeek: 3, openTime: '09:00', closeTime: '20:00', isClosed: false }, // Wed
    { dayOfWeek: 4, openTime: '09:00', closeTime: '20:00', isClosed: false }, // Thu
    { dayOfWeek: 5, openTime: '09:00', closeTime: '14:00', isClosed: false }, // Fri
    { dayOfWeek: 6, openTime: '09:00', closeTime: '20:00', isClosed: true  }, // Sat (Shabbat)
  ]
  for (const d of days) {
    await prisma.workingHours.create({ data: { stylistId, ...d } })
  }
}

// ג”€ג”€ Main ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€

async function main() {
  console.log('נ± Seeding database...')

  // ג”€ג”€ Business 1: ׳׳¡׳₪׳¨׳× ׳©׳¨׳” ג€” Hair salon in Tel Aviv ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
  const owner1 = await prisma.user.upsert({
    where: { phone: '0501111001' },
    update: {},
    create: {
      phone: '0501111001', name: '׳©׳¨׳” ׳׳•׳™', email: 'sarah@dura-seed.com',
      role: 'BUSINESS', referralCode: 'SARAH001',
    },
  })

  const biz1 = await prisma.business.upsert({
    where: { ownerId: owner1.id },
    update: {},
    create: {
      ownerId: owner1.id,
      name: '׳׳¡׳₪׳¨׳× ׳©׳¨׳”',
      description: '׳׳¡׳₪׳¨׳” ׳‘׳•׳˜׳™׳§ ׳¢׳ 15 ׳©׳ ׳•׳× ׳ ׳™׳¡׳™׳•׳. ׳׳×׳׳—׳™׳ ׳‘׳¦׳‘׳™׳¢׳”, ׳§׳¨׳˜׳™׳ ׳•׳×׳•׳¡׳₪׳•׳× ׳©׳™׳¢׳¨.',
      address: '׳“׳™׳–׳ ׳’׳•׳£ 120, ׳×׳ ׳׳‘׳™׳‘',
      lat: 32.0793,
      lng: 34.7746,
      phone: '03-5551001',
      category: ['׳©׳™׳¢׳¨'],
      photos: [],
      isActive: true,
      loyaltyEnabled: true,
      pointsPerHundredAgorot: 10,
    },
  })

  const stylist1a = await prisma.stylist.create({
    data: { businessId: biz1.id, name: '׳©׳¨׳” ׳׳•׳™', isActive: true },
  })
  const stylist1b = await prisma.stylist.create({
    data: { businessId: biz1.id, name: '׳׳™׳›׳ ׳›׳”׳', isActive: true },
  })

  await seedWorkingHours(stylist1a.id)
  await seedWorkingHours(stylist1b.id)

  await prisma.service.createMany({ data: [
    { businessId: biz1.id, stylistId: stylist1a.id, nameHe: '׳×׳¡׳₪׳•׳¨׳× + ׳₪׳',      price: ils(180), durationMinutes: 60 },
    { businessId: biz1.id, stylistId: stylist1a.id, nameHe: '׳¦׳‘׳™׳¢׳” ׳©׳•׳¨׳©׳™׳',      price: ils(280), durationMinutes: 90 },
    { businessId: biz1.id, stylistId: stylist1a.id, nameHe: '׳§׳¨׳˜׳™׳',              price: ils(650), durationMinutes: 180 },
    { businessId: biz1.id, stylistId: stylist1a.id, nameHe: '׳’׳•׳•׳ ׳™׳ + ׳₪׳',       price: ils(450), durationMinutes: 150 },
    { businessId: biz1.id, stylistId: stylist1b.id, nameHe: '׳×׳¡׳₪׳•׳¨׳×',             price: ils(120), durationMinutes: 45 },
    { businessId: biz1.id, stylistId: stylist1b.id, nameHe: '׳₪׳ ׳‘׳׳‘׳“',            price: ils(100), durationMinutes: 30 },
  ]})

  // ג”€ג”€ Business 2: ׳ ׳™׳™׳ ׳‘׳¨ ׳’׳ ג€” Nails in Tel Aviv ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
  const owner2 = await prisma.user.upsert({
    where: { phone: '0501111002' },
    update: {},
    create: {
      phone: '0501111002', name: '׳’׳ ׳׳‘׳¨׳”׳', email: 'gal@dura-seed.com',
      role: 'BUSINESS', referralCode: 'GAL0002',
    },
  })

  const biz2 = await prisma.business.upsert({
    where: { ownerId: owner2.id },
    update: {},
    create: {
      ownerId: owner2.id,
      name: '׳ ׳™׳™׳ ׳‘׳¨ ׳’׳',
      description: '׳ ׳™׳ ׳‘׳¨ ׳׳•׳‘׳™׳ ׳‘׳×׳ ׳׳‘׳™׳‘. ׳’\'׳, ׳׳§׳¨׳™׳, ׳¢׳™׳¦׳•׳‘׳™׳ ׳™׳™׳—׳•׳“׳™׳™׳.',
      address: '׳‘׳ ׳™׳”׳•׳“׳” 55, ׳×׳ ׳׳‘׳™׳‘',
      lat: 32.0850,
      lng: 34.7730,
      phone: '03-5552002',
      category: ['׳¦׳™׳₪׳•׳¨׳ ׳™׳™׳', '׳׳ ׳™׳§׳•׳¨ / ׳₪׳“׳™׳§׳•׳¨'],
      photos: [],
      isActive: true,
      loyaltyEnabled: true,
      pointsPerHundredAgorot: 15,
    },
  })

  const stylist2a = await prisma.stylist.create({
    data: { businessId: biz2.id, name: '׳’׳ ׳׳‘׳¨׳”׳', isActive: true },
  })
  const stylist2b = await prisma.stylist.create({
    data: { businessId: biz2.id, name: '׳¨׳•׳×׳ ׳©׳׳©', isActive: true },
  })

  await seedWorkingHours(stylist2a.id)
  await seedWorkingHours(stylist2b.id)

  await prisma.service.createMany({ data: [
    { businessId: biz2.id, stylistId: stylist2a.id, nameHe: '׳’\'׳ ׳™׳“׳™׳™׳',         price: ils(160), durationMinutes: 60 },
    { businessId: biz2.id, stylistId: stylist2a.id, nameHe: '׳’\'׳ ׳¨׳’׳׳™׳™׳',        price: ils(180), durationMinutes: 70 },
    { businessId: biz2.id, stylistId: stylist2a.id, nameHe: '׳׳§׳¨׳™׳ + ׳¢׳™׳¦׳•׳‘',     price: ils(280), durationMinutes: 90 },
    { businessId: biz2.id, stylistId: stylist2b.id, nameHe: '׳׳ ׳™׳§׳•׳¨ ׳§׳׳׳¡׳™',       price: ils(80),  durationMinutes: 40 },
    { businessId: biz2.id, stylistId: stylist2b.id, nameHe: '׳₪׳“׳™׳§׳•׳¨ ׳¡׳₪׳',         price: ils(130), durationMinutes: 60 },
    { businessId: biz2.id, stylistId: stylist2b.id, nameHe: '׳’\'׳ + ׳₪׳“׳™׳§׳•׳¨',     price: ils(290), durationMinutes: 120 },
  ]})

  // ג”€ג”€ Business 3: ׳¡׳˜׳•׳“׳™׳• ׳¨׳™׳¡׳™׳ ג€” Lashes in Ramat Gan ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
  const owner3 = await prisma.user.upsert({
    where: { phone: '0501111003' },
    update: {},
    create: {
      phone: '0501111003', name: '׳ ׳•׳¢׳” ׳‘׳¨׳§', email: 'noa@dura-seed.com',
      role: 'BUSINESS', referralCode: 'NOA0003',
    },
  })

  const biz3 = await prisma.business.upsert({
    where: { ownerId: owner3.id },
    update: {},
    create: {
      ownerId: owner3.id,
      name: '׳¡׳˜׳•׳“׳™׳• ׳¨׳™׳¡׳™׳ ׳ ׳•׳¢׳”',
      description: '׳׳•׳׳—׳™׳•׳× ׳‘׳”׳׳¨׳›׳•׳× ׳¨׳™׳¡׳™׳, ׳׳™׳₪׳˜׳™׳ ׳’ ׳•׳¦׳‘׳™׳¢׳”. ׳×׳•׳¦׳׳•׳× ׳˜׳‘׳¢׳™׳•׳× ׳•׳׳•׳©׳׳׳•׳×.',
      address: '׳‘׳™׳׳׳™׳§ 30, ׳¨׳׳× ׳’׳',
      lat: 32.0700,
      lng: 34.8100,
      phone: '03-5553003',
      category: ['׳¨׳™׳¡׳™׳', '׳’׳‘׳•׳×'],
      photos: [],
      isActive: true,
      loyaltyEnabled: false,
    },
  })

  const stylist3a = await prisma.stylist.create({
    data: { businessId: biz3.id, name: '׳ ׳•׳¢׳” ׳‘׳¨׳§', isActive: true },
  })

  await seedWorkingHours(stylist3a.id)

  await prisma.service.createMany({ data: [
    { businessId: biz3.id, stylistId: stylist3a.id, nameHe: '׳”׳׳¨׳›׳•׳× ׳¨׳™׳¡׳™׳ ׳§׳׳׳¡׳™', price: ils(320), durationMinutes: 120 },
    { businessId: biz3.id, stylistId: stylist3a.id, nameHe: '׳”׳׳¨׳›׳•׳× ׳¨׳™׳¡׳™׳ volume', price: ils(420), durationMinutes: 150 },
    { businessId: biz3.id, stylistId: stylist3a.id, nameHe: '׳׳™׳₪׳˜׳™׳ ׳’ ׳¨׳™׳¡׳™׳',       price: ils(220), durationMinutes: 60 },
    { businessId: biz3.id, stylistId: stylist3a.id, nameHe: '׳¦׳‘׳™׳¢׳× ׳¨׳™׳¡׳™׳',         price: ils(80),  durationMinutes: 30 },
    { businessId: biz3.id, stylistId: stylist3a.id, nameHe: '׳₪׳™׳׳™׳ ׳’ ׳’׳‘׳•׳×',         price: ils(120), durationMinutes: 30 },
    { businessId: biz3.id, stylistId: stylist3a.id, nameHe: '׳׳׳™׳ ׳¦׳™׳” ׳’׳‘׳•׳×',        price: ils(200), durationMinutes: 60 },
  ]})

  // ג”€ג”€ Business 4: ׳§׳׳™׳ ׳™׳§׳× ׳™׳•׳₪׳™ ׳“׳ ׳” ג€” Facial + Massage in Herzliya ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
  const owner4 = await prisma.user.upsert({
    where: { phone: '0501111004' },
    update: {},
    create: {
      phone: '0501111004', name: '׳“׳ ׳” ׳׳–׳¨׳—׳™', email: 'dana@dura-seed.com',
      role: 'BUSINESS', referralCode: 'DANA004',
    },
  })

  const biz4 = await prisma.business.upsert({
    where: { ownerId: owner4.id },
    update: {},
    create: {
      ownerId: owner4.id,
      name: '׳§׳׳™׳ ׳™׳§׳× ׳™׳•׳₪׳™ ׳“׳ ׳”',
      description: '׳˜׳™׳₪׳•׳׳™ ׳₪׳ ׳™׳ ׳׳§׳¦׳•׳¢׳™׳™׳ ׳•׳¢׳™׳¡׳•׳™׳™׳ ׳׳¨׳’׳™׳¢׳™׳. ׳”׳–׳׳ ׳›׳¢׳× ׳•׳—׳™׳“׳©׳™ ׳׳× ׳¢׳•׳¨׳.',
      address: '׳¡׳•׳§׳•׳׳•׳‘ 10, ׳”׳¨׳¦׳׳™׳”',
      lat: 32.1650,
      lng: 34.8440,
      phone: '09-5554004',
      category: ['׳˜׳™׳₪׳•׳ ׳₪׳ ׳™׳', '׳¢׳™׳¡׳•׳™'],
      photos: [],
      isActive: true,
      loyaltyEnabled: true,
      pointsPerHundredAgorot: 12,
    },
  })

  const stylist4a = await prisma.stylist.create({
    data: { businessId: biz4.id, name: '׳“׳ ׳” ׳׳–׳¨׳—׳™', isActive: true },
  })
  const stylist4b = await prisma.stylist.create({
    data: { businessId: biz4.id, name: '׳™׳¢׳ ׳©׳₪׳™׳¨׳', isActive: true },
  })

  await seedWorkingHours(stylist4a.id)
  await seedWorkingHours(stylist4b.id)

  await prisma.service.createMany({ data: [
    { businessId: biz4.id, stylistId: stylist4a.id, nameHe: '׳˜׳™׳₪׳•׳ ׳₪׳ ׳™׳ ׳‘׳¡׳™׳¡׳™',    price: ils(250), durationMinutes: 60 },
    { businessId: biz4.id, stylistId: stylist4a.id, nameHe: '׳˜׳™׳₪׳•׳ ׳₪׳ ׳™׳ ׳¢׳׳•׳§',     price: ils(380), durationMinutes: 90 },
    { businessId: biz4.id, stylistId: stylist4a.id, nameHe: '׳₪׳™׳׳™׳ ׳’ ׳›׳™׳׳™',          price: ils(450), durationMinutes: 75 },
    { businessId: biz4.id, stylistId: stylist4b.id, nameHe: '׳¢׳™׳¡׳•׳™ ׳©׳•׳•׳“׳™ 60 ׳“׳§׳•׳×', price: ils(300), durationMinutes: 60 },
    { businessId: biz4.id, stylistId: stylist4b.id, nameHe: '׳¢׳™׳¡׳•׳™ ׳’׳‘ + ׳›׳×׳₪׳™׳™׳',   price: ils(200), durationMinutes: 40 },
    { businessId: biz4.id, stylistId: stylist4b.id, nameHe: '׳¢׳™׳¡׳•׳™ + ׳˜׳™׳₪׳•׳ ׳₪׳ ׳™׳',  price: ils(550), durationMinutes: 120 },
  ]})

  // ג”€ג”€ Business 5: ׳׳™׳™׳–׳¨ ׳₪׳¨׳™׳׳™׳•׳ ג€” Laser in Ramat Hasharon ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
  const owner5 = await prisma.user.upsert({
    where: { phone: '0501111005' },
    update: {},
    create: {
      phone: '0501111005', name: '׳¨׳™׳ ׳× ׳׳•׳—׳ ׳”', email: 'rinat@dura-seed.com',
      role: 'BUSINESS', referralCode: 'RINA005',
    },
  })

  const biz5 = await prisma.business.upsert({
    where: { ownerId: owner5.id },
    update: {},
    create: {
      ownerId: owner5.id,
      name: '׳׳™׳™׳–׳¨ ׳₪׳¨׳™׳׳™׳•׳',
      description: '׳”׳¡׳¨׳× ׳©׳™׳¢׳¨ ׳‘׳׳™׳™׳–׳¨ ׳¢׳ ׳˜׳›׳ ׳•׳׳•׳’׳™׳” ׳׳×׳§׳“׳׳×. ׳×׳•׳¦׳׳•׳× ׳׳›׳ ׳”׳¡׳•׳’׳™ ׳¢׳•׳¨.',
      address: '׳׳‘׳ ׳”׳׳ 7, ׳¨׳׳× ׳”׳©׳¨׳•׳',
      lat: 32.1450,
      lng: 34.8340,
      phone: '03-5555005',
      category: ['׳׳™׳™׳–׳¨', '׳©׳¢׳•׳•׳” / ׳׳₪׳™׳׳¦׳™׳”'],
      photos: [],
      isActive: true,
      loyaltyEnabled: false,
    },
  })

  const stylist5a = await prisma.stylist.create({
    data: { businessId: biz5.id, name: '׳¨׳™׳ ׳× ׳׳•׳—׳ ׳”', isActive: true },
  })

  await seedWorkingHours(stylist5a.id)

  await prisma.service.createMany({ data: [
    { businessId: biz5.id, stylistId: stylist5a.id, nameHe: '׳׳™׳™׳–׳¨ ׳‘׳™׳§׳™׳ ׳™',         price: ils(400), durationMinutes: 30 },
    { businessId: biz5.id, stylistId: stylist5a.id, nameHe: '׳׳™׳™׳–׳¨ ׳¨׳’׳׳™׳™׳ ׳׳׳׳•׳×',   price: ils(900), durationMinutes: 60 },
    { businessId: biz5.id, stylistId: stylist5a.id, nameHe: '׳׳™׳™׳–׳¨ ׳₪׳ ׳™׳',            price: ils(350), durationMinutes: 20 },
    { businessId: biz5.id, stylistId: stylist5a.id, nameHe: '׳׳™׳™׳–׳¨ ׳‘׳˜׳',             price: ils(300), durationMinutes: 20 },
    { businessId: biz5.id, stylistId: stylist5a.id, nameHe: '׳©׳¢׳•׳•׳” ׳‘׳¨׳–׳™׳׳׳™׳×',        price: ils(180), durationMinutes: 30 },
    { businessId: biz5.id, stylistId: stylist5a.id, nameHe: '׳©׳¢׳•׳•׳” ׳’׳₪׳™׳™׳ ׳¢׳׳™׳•׳ ׳•׳×',   price: ils(100), durationMinutes: 20 },
  ]})

  console.log('ג… Seed complete!')
  console.log('   5 businesses | 9 stylists | 30 services')
  console.log('   Business owner phones: 0501111001 ג€“ 0501111005')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

