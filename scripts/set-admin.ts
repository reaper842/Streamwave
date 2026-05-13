import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('DATABASE_URL is not set')
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: 'demo@streamwave.app' },
    data: { is_admin: true },
  })
  console.log(`Updated ${result.count} user(s) to admin`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
