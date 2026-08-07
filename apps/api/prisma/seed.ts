import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const empHash = await bcrypt.hash('Employee123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash: adminHash,
    },
    create: {
      name: 'System Admin',
      email: 'admin@example.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
      department: 'Management',
      position: 'Administrator',
    },
  });

  const employees = await Promise.all(
    [
      { name: 'Alice Johnson', email: 'alice@example.com', position: 'Backend Developer' },
      { name: 'Bob Smith', email: 'bob@example.com', position: 'Frontend Developer' },
      { name: 'Carol Davis', email: 'carol@example.com', position: 'QA Engineer' },
      { name: 'David Lee', email: 'david@example.com', position: 'DevOps Engineer' },
    ].map((e) =>
      prisma.user.upsert({
        where: { email: e.email },
        update: {
          passwordHash: empHash,
        },
        create: {
          ...e,
          passwordHash: empHash,
          role: Role.EMPLOYEE,
          department: 'Engineering',
        },
      }),
    ),
  );

  const sampleTasks = [
    { title: 'Set up CI/CD pipeline', priority: Priority.HIGH, status: TaskStatus.IN_PROGRESS, assignedToId: employees[3].id, progress: 40 },
    { title: 'Design database schema', priority: Priority.URGENT, status: TaskStatus.COMPLETED, assignedToId: employees[0].id, progress: 100 },
    { title: 'Implement login page', priority: Priority.MEDIUM, status: TaskStatus.TESTING, assignedToId: employees[1].id, progress: 90 },
    { title: 'Write API documentation', priority: Priority.LOW, status: TaskStatus.TODO, assignedToId: employees[0].id },
    { title: 'Fix notification bug', priority: Priority.HIGH, status: TaskStatus.RETURNED, assignedToId: employees[1].id, progress: 60 },
    { title: 'Load testing', priority: Priority.MEDIUM, status: TaskStatus.TODO, assignedToId: employees[2].id },
  ];

  for (const t of sampleTasks) {
    const existing = await prisma.task.findFirst({ where: { title: t.title } });
    if (existing) continue;
    await prisma.task.create({
      data: {
        ...t,
        description: `Sample task: ${t.title}`,
        createdById: admin.id,
        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        history: {
          create: {
            fromStatus: null,
            toStatus: t.status,
            actorId: admin.id,
            note: 'Task created (seed)',
          },
        },
      },
    });
  }

  console.log('Seed complete. Admin: admin@example.com / Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
