import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedWorkflows() {
  console.log('Workflow seed skipped.');
}

if (require.main === module) {
  seedWorkflows()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
