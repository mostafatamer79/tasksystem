# Task Deletion, Dashboard Archive, and Tomorrow Appointments Design

**Date:** 2026-09-05

## Objective

Give administrators precise control over task deletion, including date and status filters and whether deleted tasks remain represented in dashboard statistics. Add a separate operation to clear every archived dashboard statistic. Make the Arabic `مواعيد بكرا` workflow easy to create while preventing duplicate active plan tasks and duplicate dashboard counts.

## Scope

This change covers:

- The administrator bulk-delete API and task-list dialog.
- Archived dashboard-statistic creation and full archive clearing.
- Dashboard query invalidation after either operation.
- A built-in `مواعيد بكرا` workflow template.
- Transactional normalization and deduplication of active `مواعيد بكرا` tasks within one plan.
- Automated tests and Arabic/English UI copy.

It does not change ordinary task status transitions, historical audit entries, or deduplicate unrelated task titles.

## Bulk Delete Contract

Replace the current loose bulk-delete body with a validated DTO. The request supports these selectors:

- `ids`: explicitly selected task IDs.
- `all`: all tasks eligible under the supplied filters.
- `status`: one `TaskStatus`; omission means all statuses.
- `fromDate` and `toDate`: optional ISO date-only values defining an inclusive calendar-date range; omitting both means all periods.
- `removeFromDashboard`: boolean, defaulting to `false` for backward-compatible preservation of archived statistics.

Explicit IDs remain authoritative for selected-row deletion, while status and date filters apply to broad deletion through `all`. The API rejects an empty selector, invalid statuses, invalid dates, and a range whose start is after its end. Date filtering uses task `createdAt`, matching the dashboard's existing employee-period reporting. The end date is converted to an exclusive start-of-next-day boundary to keep the requested calendar day inclusive.

All reads, archive updates, plan-link deletion, and task deletion occur in one database transaction. When `removeFromDashboard` is `false`, the service first adds the deleted tasks to `ArchivedStat`, preserving current dashboard behavior. When it is `true`, the service deletes the tasks without adding archive counters, so their totals disappear from dashboard calculations. Existing archived counters are not retroactively changed by this checkbox.

The response reports the number of deleted tasks. Audit metadata records the selector, filters, deletion count, and whether dashboard statistics were preserved.

## Clear Entire Dashboard Archive

Add an administrator-only endpoint dedicated to clearing `ArchivedStat`. It accepts no period or status filters and deletes every archived-statistic row in one operation. It does not delete live tasks.

The task page exposes this as a separate destructive action named “Clear Dashboard Archive.” It requires a confirmation explaining that all historical statistics retained from deleted tasks will be permanently removed. On success, all dashboard query families are invalidated immediately.

## Task-List User Experience

The existing bulk-delete confirmation becomes a small delete-options dialog. It contains:

- Scope: selected tasks or all tasks.
- Period: all periods or a custom start/end range.
- Status: all statuses or one status from the existing status constants.
- “Remove from dashboard statistics” checkbox, disabled by default.

The dialog summarizes the destructive result before confirmation. The separate archive-clear action is visually distinct and never inherits the delete dialog's current filters. All labels, validation messages, confirmations, success messages, and errors are added to both English and Arabic translation files.

## `مواعيد بكرا` Template

Add a stable built-in template identifier, `tomorrow-appointments`, displayed as `مواعيد بكرا`. Persist that identity in nullable `Task.workflowTemplateId` and `PlanTask.workflowTemplateId` fields. Selecting it pre-fills the task title, one-day due date, medium priority, and relevant workflow configuration through the existing workflow-template mechanism. Title comparisons use a normalized value: Unicode-normalized, trimmed, and with repeated internal whitespace collapsed; destructive reconciliation requires the stable template identity and never relies on title alone.

Within a single plan, only one active generated task for this template may exist. “Active” means any status other than `COMPLETED` or `PUBLISHED`.

When plan publication or plan-task upsert would generate another active `مواعيد بكرا` task:

1. Locate active matching generated tasks linked to the same plan.
2. Select the most recently updated match as the canonical task.
3. Update that task in place with the newest title, description, priority, due date, assignee, and workflow configuration. Preserve its task ID, comments, history, root/parent links, and plan association.
4. Remove additional active duplicate tasks and their duplicate plan-task links inside the same transaction.
5. Point the current plan task at the canonical task.

Completed and published historical tasks are retained and do not block creation of the next active occurrence. Deduplication is scoped to this built-in template and the same plan, so ordinary tasks that happen to have similar names elsewhere are untouched.

## Dashboard Consistency

Normal task and plan queries should return only the canonical active template task after reconciliation. Dashboard live-task aggregations therefore count it once without title-based filtering in every dashboard query. Duplicate cleanup uses `removeFromDashboard: true` semantics so removed accidental duplicates are not archived and cannot reappear in totals.

This establishes one source of truth at write time instead of adding fragile dashboard-only exceptions.

## Error Handling and Authorization

- All deletion and archive-clear operations remain administrator-only.
- Invalid filters return a validation error without modifying data.
- Transaction failure rolls back archive counters, plan links, deduplication, and task deletion together.
- A successful request matching no tasks returns `deletedCount: 0` and does not fail.
- Template reconciliation never updates a completed or published historical task.

## Testing

Backend tests cover:

- All-period/all-status deletion.
- Inclusive date range and single-status filtering.
- Invalid selector and date-range rejection.
- Preservation of dashboard archive counters by default.
- `removeFromDashboard: true` skipping archive counters.
- Full archive clearing without deleting live tasks.
- Administrator authorization on destructive endpoints.
- Template selection and normalized title handling.
- Updating one existing active plan task rather than creating another.
- Removing extra active duplicates without archiving them.
- Retaining completed/published history and creating the next active occurrence.
- Dashboard totals counting the canonical active task once.

Frontend coverage focuses on request payload construction, dialog validation, query invalidation, and translated copy. Repository lint, API tests/build, and web build are run before completion using the scripts actually present in the monorepo.

## Compatibility and Migration

A forward-only schema migration adds nullable `workflowTemplateId` columns and supporting indexes to `Task` and `PlanTask`. Existing rows remain compatible. The migration backfills legacy automated, publishing-required `مواعيد بكرا` tasks and their plan links with the stable identifier. Production applies this migration with `prisma migrate deploy` before the updated API starts. The API keeps `ids` and `all` compatibility. The legacy `allCompleted` input is translated to `all: true` plus `status: COMPLETED` during the transition, then may be removed in a separately versioned cleanup.

## Assumptions

- “Period” refers to task creation date, consistent with current dashboard date filtering.
- “Remove from dashboard” affects the tasks being deleted now; clearing older retained statistics is handled only by the separate full-archive action.
- `مواعيد بكرا` uniqueness is per plan and only among active tasks.
- Updating the canonical task is preferable to delete-and-recreate because it preserves task identity and history.
