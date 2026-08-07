import { Role, TaskStatus } from '@prisma/client';
import { TaskStateMachine } from './task-state-machine';

describe('TaskStateMachine', () => {
  const sm = new TaskStateMachine();

  describe('employee transitions', () => {
    it.each([
      [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
      [TaskStatus.IN_PROGRESS, TaskStatus.TESTING],
      [TaskStatus.RETURNED, TaskStatus.IN_PROGRESS],
    ])('allows %s → %s', (from, to) => {
      expect(sm.canTransition(Role.EMPLOYEE, from, to)).toBe(true);
      expect(() => sm.assertTransition(Role.EMPLOYEE, from, to)).not.toThrow();
    });

    it.each([
      [TaskStatus.TODO, TaskStatus.TESTING],
      [TaskStatus.TODO, TaskStatus.COMPLETED],
      [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED],
      [TaskStatus.IN_PROGRESS, TaskStatus.RETURNED],
      [TaskStatus.TESTING, TaskStatus.COMPLETED],
      [TaskStatus.TESTING, TaskStatus.RETURNED],
      [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS],
      [TaskStatus.RETURNED, TaskStatus.COMPLETED],
    ])('rejects %s → %s', (from, to) => {
      expect(sm.canTransition(Role.EMPLOYEE, from, to)).toBe(false);
      expect(() => sm.assertTransition(Role.EMPLOYEE, from, to)).toThrow(
        `Transition ${from} → ${to} is not allowed`,
      );
    });
  });

  describe('admin transitions', () => {
    it.each([
      [TaskStatus.TESTING, TaskStatus.COMPLETED],
      [TaskStatus.TESTING, TaskStatus.RETURNED],
    ])('allows %s → %s', (from, to) => {
      expect(sm.canTransition(Role.ADMIN, from, to)).toBe(true);
      expect(() => sm.assertTransition(Role.ADMIN, from, to)).not.toThrow();
    });

    it.each([
      [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
      [TaskStatus.IN_PROGRESS, TaskStatus.TESTING],
      [TaskStatus.COMPLETED, TaskStatus.RETURNED],
      [TaskStatus.RETURNED, TaskStatus.IN_PROGRESS],
    ])('rejects %s → %s (admin uses full edit for these)', (from, to) => {
      expect(sm.canTransition(Role.ADMIN, from, to)).toBe(false);
      expect(() => sm.assertTransition(Role.ADMIN, from, to)).toThrow();
    });
  });

  it('rejects no-op transitions', () => {
    expect(() => sm.assertTransition(Role.EMPLOYEE, TaskStatus.TODO, TaskStatus.TODO)).toThrow(
      'already in status',
    );
  });

  describe('progress updates', () => {
    it('allows employees to update progress while IN_PROGRESS', () => {
      expect(() => sm.assertProgressUpdate(Role.EMPLOYEE, TaskStatus.IN_PROGRESS)).not.toThrow();
    });

    it.each([TaskStatus.TODO, TaskStatus.TESTING, TaskStatus.COMPLETED, TaskStatus.RETURNED])(
      'rejects employee progress update while %s',
      (status) => {
        expect(() => sm.assertProgressUpdate(Role.EMPLOYEE, status)).toThrow();
      },
    );

    it('always allows admins', () => {
      for (const status of Object.values(TaskStatus)) {
        expect(() => sm.assertProgressUpdate(Role.ADMIN, status)).not.toThrow();
      }
    });
  });
});
