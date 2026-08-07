import { BalancedAssignmentStrategy } from './balanced.strategy';
import { TxClient } from './assignment-strategy';

interface MockEmployee {
  id: string;
}

function makeTx(employees: MockEmployee[], counts: { assignedToId: string; _count: { _all: number } }[]) {
  const userFindMany = jest.fn().mockResolvedValue(employees);
  const groupBy = jest.fn().mockResolvedValue(counts);
  const tx = { user: { findMany: userFindMany }, task: { groupBy } } as unknown as TxClient;
  return { tx, userFindMany, groupBy };
}

describe('BalancedAssignmentStrategy', () => {
  const strategy = new BalancedAssignmentStrategy();

  it('picks the employee with the fewest active tasks', async () => {
    const { tx } = makeTx(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        { assignedToId: 'a', _count: { _all: 5 } },
        { assignedToId: 'b', _count: { _all: 2 } },
        { assignedToId: 'c', _count: { _all: 3 } },
      ],
    );
    await expect(strategy.resolveAssignee(tx)).resolves.toBe('b');
  });

  it('treats employees with no tasks as zero workload', async () => {
    const { tx } = makeTx(
      [{ id: 'a' }, { id: 'b' }],
      [{ assignedToId: 'a', _count: { _all: 4 } }],
    );
    await expect(strategy.resolveAssignee(tx)).resolves.toBe('b');
  });

  it('breaks ties at random among min-count employees', async () => {
    const { tx } = makeTx(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        { assignedToId: 'a', _count: { _all: 1 } },
        { assignedToId: 'b', _count: { _all: 1 } },
        { assignedToId: 'c', _count: { _all: 9 } },
      ],
    );
    const picks = new Set<string>();
    for (let i = 0; i < 200; i++) picks.add(await strategy.resolveAssignee(tx));
    expect(picks).toEqual(new Set(['a', 'b']));
  });

  it('excludes inactive employees via the user query filter', async () => {
    const { tx, userFindMany } = makeTx([{ id: 'a' }], []);
    await strategy.resolveAssignee(tx);
    expect(userFindMany).toHaveBeenCalledWith({
      where: { role: 'EMPLOYEE', isActive: true },
      select: { id: true },
    });
  });

  it('counts active tasks and tasks completed today', async () => {
    const { tx, groupBy } = makeTx([{ id: 'a' }], []);
    await strategy.resolveAssignee(tx);
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { status: { not: 'COMPLETED' } },
            { status: 'COMPLETED', updatedAt: { gte: expect.any(Date) } },
          ],
        }),
      }),
    );
  });

  it('throws when no active employees exist', async () => {
    const { tx } = makeTx([], []);
    await expect(strategy.resolveAssignee(tx)).rejects.toThrow('No active employees');
  });
});
