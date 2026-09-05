# Task Deletion, Dashboard Archive, and Tomorrow Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add filtered task deletion with optional dashboard removal, full archive clearing, and a deduplicated `مواعيد بكرا` plan workflow template.

**Architecture:** A validated NestJS DTO builds one Prisma task predicate and drives transactional archive/deletion behavior. Archive clearing is a separate administrator endpoint. Tomorrow-template reconciliation is centralized in the workflow service so plan publication and upsert share one write-time uniqueness rule; the Next.js task screen sends the new contract and invalidates dashboard data.

**Tech Stack:** NestJS 11, Prisma 6, Jest 29, Next.js 15 App Router, React 19, TanStack Query 5, next-intl 4.

**Spec:** `docs/superpowers/specs/2026-09-05-task-deletion-dashboard-and-tomorrow-template-design.md`

## Global Constraints

- Preserve current public task behavior outside deletion and the built-in tomorrow template.
- Use task `createdAt` for inclusive calendar-period filtering.
- `removeFromDashboard` defaults to `false`.
- Clearing the archive always deletes every `ArchivedStat` row and never deletes a live task.
- Template uniqueness is per plan and only for active tasks whose status is neither `COMPLETED` nor `PUBLISHED`.
- Preserve the existing project package manager and dependency versions.
- No database migration is required.

---

## File Structure

- `apps/api/src/tasks/dto/bulk-delete-tasks.dto.ts`: validates the destructive API request and exposes the stable request type.
- `apps/api/src/tasks/tasks.service.spec.ts`: specifies filter, archive, clear-all, and transaction behavior.
- `apps/api/src/tasks/tasks.service.ts`: constructs task selection predicates and performs transactional deletion/archive clearing.
- `apps/api/src/tasks/tasks.controller.ts`: exposes validated administrator endpoints and count responses.
- `apps/api/src/workflow/workflow-templates.ts`: declares the stable `tomorrow-appointments` template.
- `apps/api/src/workflow/workflow.service.spec.ts`: specifies normalized matching, canonical updates, and duplicate removal.
- `apps/api/src/workflow/workflow.service.ts`: reconciles generated tomorrow tasks within a plan transaction.
- `apps/web/src/lib/types.ts`: publishes deletion request/response types.
- `apps/web/src/lib/hooks.ts`: sends deletion and archive-clear requests and invalidates task/dashboard queries.
- `apps/web/src/app/[locale]/(app)/tasks/page.tsx`: renders the delete-options and archive-clear interactions.
- `apps/web/src/components/tasks/task-form-dialog.tsx`: applies the template's default title when selected.
- `apps/web/messages/en.json` and `apps/web/messages/ar.json`: localize all added controls and messages.

### Task 1: Validated Filtered Deletion and Archive Semantics

**Files:**
- Create: `apps/api/src/tasks/dto/bulk-delete-tasks.dto.ts`
- Create: `apps/api/src/tasks/tasks.service.spec.ts`
- Modify: `apps/api/src/tasks/tasks.service.ts`
- Modify: `apps/api/src/tasks/tasks.controller.ts`

**Interfaces:**
- Produces: `BulkDeleteTasksDto` with `ids?: string[]`, `all?: boolean`, `allCompleted?: boolean`, `status?: TaskStatus`, `fromDate?: string`, `toDate?: string`, and `removeFromDashboard?: boolean`.
- Produces: `TasksService.bulkDelete(dto, actor): Promise<{ deletedCount: number }>`.
- Produces: `TasksService.clearDashboardArchive(actor): Promise<{ deletedCount: number }>`.

- [ ] **Step 1: Write failing service tests**

Add Jest cases using a mocked Prisma transaction that assert the concrete `task.findMany` predicate and side effects:

```ts
it('deletes one status in an inclusive creation-date range without archiving', async () => {
  prisma.task.findMany.mockResolvedValue([task]);

  await service.bulkDelete({
    all: true,
    status: TaskStatus.IN_PROGRESS,
    fromDate: '2026-09-01',
    toDate: '2026-09-05',
    removeFromDashboard: true,
  }, admin);

  expect(prisma.task.findMany).toHaveBeenCalledWith({ where: {
    status: TaskStatus.IN_PROGRESS,
    createdAt: { gte: new Date('2026-09-01T00:00:00.000Z'), lt: new Date('2026-09-06T00:00:00.000Z') },
  }});
  expect(tx.archivedStat.upsert).not.toHaveBeenCalled();
  expect(tx.task.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [task.id] } } });
});

it('preserves archived dashboard totals by default', async () => {
  prisma.task.findMany.mockResolvedValue([task]);
  await service.bulkDelete({ ids: [task.id] }, admin);
  expect(tx.archivedStat.upsert).toHaveBeenCalled();
});

it('clears every archived statistic without deleting live tasks', async () => {
  tx.archivedStat.deleteMany.mockResolvedValue({ count: 7 });
  await expect(service.clearDashboardArchive(admin)).resolves.toEqual({ deletedCount: 7 });
  expect(tx.archivedStat.deleteMany).toHaveBeenCalledWith({});
  expect(tx.task.deleteMany).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -w apps/api -- --runInBand src/tasks/tasks.service.spec.ts`

Expected: FAIL because the DTO, filtered predicate, count response, and archive-clear method do not exist.

- [ ] **Step 3: Implement boundary validation and transactional behavior**

Use `class-validator` decorators for UUID arrays, enum status, ISO date strings, and booleans. Add a DTO-level or service-level invariant that accepts exactly an explicit non-empty ID scope or a broad `all` scope; translate `allCompleted` into `status: COMPLETED`. Construct UTC date boundaries from date-only strings and reject `fromDate > toDate` with `BadRequestException`.

Move `task.findMany` inside the existing transaction so selection, archive increments, plan-link deletion, and task deletion share one snapshot. Only execute `archivedStat.upsert` when `removeFromDashboard !== true`. Return `{ deletedCount: tasks.length }`, including zero matches. Add `clearDashboardArchive` as a transaction containing only `archivedStat.deleteMany({})`, then record audit metadata.

- [ ] **Step 4: Wire controller endpoints**

Change `POST /tasks/bulk-delete` to accept `BulkDeleteTasksDto` and return the service result. Add:

```ts
@Delete('dashboard-archive')
@Roles(Role.ADMIN)
clearDashboardArchive(@CurrentUser() actor: AuthUser) {
  return this.tasks.clearDashboardArchive(actor);
}
```

Place the static route before `@Delete(':id')` so it cannot be interpreted as a task ID.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -w apps/api -- --runInBand src/tasks/tasks.service.spec.ts`

Expected: PASS with filtered deletion, both archive modes, zero matches, legacy `allCompleted`, invalid range, and full archive-clear cases green.

### Task 2: Tomorrow Template Reconciliation

**Files:**
- Modify: `apps/api/src/workflow/workflow-templates.ts`
- Modify: `apps/api/src/workflow/workflow.service.spec.ts`
- Modify: `apps/api/src/workflow/workflow.service.ts`

**Interfaces:**
- Produces: `TOMORROW_APPOINTMENTS_TEMPLATE_ID = 'tomorrow-appointments'`.
- Produces: `normalizeWorkflowTitle(title: string): string`.
- Produces: internal `reconcileTomorrowAppointmentsTask(tx, planTask, taskData): Promise<string | null>` used by `handlePlanTaskReady` before creating a task.

- [ ] **Step 1: Write failing workflow tests**

Add cases alongside the existing `handlePlanTaskReady` tests:

```ts
it('updates the newest active tomorrow task and removes active duplicates', async () => {
  tx.task.findMany.mockResolvedValue([
    { id: 'newest', title: ' مواعيد   بكرا ', status: TaskStatus.TODO, updatedAt: new Date('2026-09-05') },
    { id: 'older', title: 'مواعيد بكرا', status: TaskStatus.IN_PROGRESS, updatedAt: new Date('2026-09-04') },
  ]);

  const id = await service.handlePlanTaskReady(tx, tomorrowPlanTask, 'actor-1');

  expect(id).toBe('newest');
  expect(tx.task.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'newest' } }));
  expect(tx.planTask.deleteMany).toHaveBeenCalledWith({ where: { taskId: { in: ['older'] } } });
  expect(tx.task.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['older'] } } });
  expect(tx.archivedStat.upsert).not.toHaveBeenCalled();
  expect(tx.task.create).not.toHaveBeenCalled();
});

it('keeps completed history and creates a new active occurrence', async () => {
  tx.task.findMany.mockResolvedValue([]);
  await service.handlePlanTaskReady(tx, tomorrowPlanTask, 'actor-1');
  expect(tx.task.create).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run workflow tests and verify RED**

Run: `npm test -w apps/api -- --runInBand src/workflow/workflow.service.spec.ts`

Expected: FAIL because the template and reconciliation behavior are absent.

- [ ] **Step 3: Add the template and minimal reconciliation**

Add a template whose stable ID is `tomorrow-appointments`, name and default title are `مواعيد بكرا`, trigger status is `COMPLETED`, priority is `MEDIUM`, and default due offset is one day. Extend the template response shape with an optional `defaultTitle` so the UI can prefill the root task.

Normalize candidate titles with `title.normalize('NFC').trim().replace(/\s+/gu, ' ')`. When the plan-task title or workflow template identity represents tomorrow appointments, query tasks through `planTask.planId`, excluding `COMPLETED` and `PUBLISHED`, newest first. Update the first result with current generated fields, delete extra plan links and tasks without archive writes, and return the canonical ID. If no active match exists, use the existing creation path.

- [ ] **Step 4: Verify GREEN and regression coverage**

Run: `npm test -w apps/api -- --runInBand src/workflow/workflow.service.spec.ts`

Expected: PASS for existing workflow creation/transition cases and new tomorrow reconciliation cases.

### Task 3: Typed Web Hooks and Delete Options UI

**Files:**
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/lib/hooks.ts`
- Modify: `apps/web/src/app/[locale]/(app)/tasks/page.tsx`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/ar.json`

**Interfaces:**
- Produces: `BulkDeleteTasksInput` matching the backend DTO.
- Produces: `DeleteTasksResult = { deletedCount: number }`.
- Produces: `useClearDashboardArchive()` mutation.

- [ ] **Step 1: Add typed hook contracts**

Change `useBulkDeleteTasks` to accept `BulkDeleteTasksInput`, return `DeleteTasksResult`, and invalidate both `['tasks']` and `['dashboard']`. Add:

```ts
export function useClearDashboardArchive() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: async () => (await api.delete<DeleteTasksResult>('/tasks/dashboard-archive')).data,
    onSuccess: () => invalidate(),
  });
}
```

- [ ] **Step 2: Replace bulk confirmation state with explicit options**

Track `scope`, `status`, `fromDate`, `toDate`, and `removeFromDashboard`. The submit handler builds only these supported shapes:

```ts
const input: BulkDeleteTasksInput = scope === 'selected'
  ? { ids: [...selectedKeys], removeFromDashboard }
  : {
      all: true,
      status: deleteStatus || undefined,
      fromDate: deleteFromDate || undefined,
      toDate: deleteToDate || undefined,
      removeFromDashboard,
    };
```

Disable confirmation when selected scope has no IDs or when both dates exist and start is after end. Show the returned count in the success toast. Add an independent archive-clear confirmation that calls `useClearDashboardArchive` and never reads deletion filters.

- [ ] **Step 3: Add complete bilingual copy**

Add English and Arabic keys for scope, selected/all tasks, period, all periods, from/to date, status/all statuses, remove-from-dashboard checkbox, clear-archive action, both confirmations, validation, zero-deletion, and success/error messages. Avoid hard-coded English strings in the updated dialogs.

- [ ] **Step 4: Run web lint and type/build validation**

Run: `npm run lint:web`

If the installed Next.js version reports that `next lint` is unsupported, record that tooling limitation and proceed to the compile check.

Run: `npm run build:web`

Expected: TypeScript and Next.js build pass with no missing translation keys or invalid hook payloads.

### Task 4: Template Prefill in the Task Form

**Files:**
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/components/tasks/task-form-dialog.tsx`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/ar.json`

**Interfaces:**
- Consumes: workflow template field `defaultTitle?: string`.
- Produces: template selection that sets the root task title as well as existing workflow fields.

- [ ] **Step 1: Extend the web template type and selection behavior**

Add `defaultTitle?: string` to `WorkflowTemplate`. In `applyTemplate`, set the title only when `defaultTitle` is present, then retain the existing trigger, publishing, and next-task assignments:

```ts
if (template.defaultTitle) setValue('title', template.defaultTitle, { shouldDirty: true });
setValue('triggerStatus', template.triggerStatus);
setValue('requiresPublishing', template.requiresPublishing);
setValue('nextTasks', template.nextTasks);
```

- [ ] **Step 2: Verify the production build**

Run: `npm run build:web`

Expected: PASS and the template select compiles with the extended response type.

### Task 5: Full Verification and Delivery

**Files:**
- Verify all files changed by Tasks 1–4.

**Interfaces:**
- Consumes all earlier task outputs.
- Produces a verified, deployable feature with no migration step.

- [ ] **Step 1: Run API tests**

Run: `npm run test:api -- --runInBand`

Expected: all Jest suites pass.

- [ ] **Step 2: Run API build**

Run: `npm run build:api`

Expected: Prisma client generation and Nest build pass.

- [ ] **Step 3: Run web checks**

Run: `npm run lint:web`

Run: `npm run build:web`

Expected: all supported checks pass; any repository-tooling failure is reported verbatim and separated from code failures.

- [ ] **Step 4: Inspect the final diff**

Run: `git diff --check`

Run: `git status --short`

Confirm that no database migration, generated artifact, environment file, or unrelated user file was added.

- [ ] **Step 5: Commit the feature**

Stage only the files listed in this plan and commit with:

```bash
git commit -m "feat: add filtered task deletion and tomorrow template"
```
