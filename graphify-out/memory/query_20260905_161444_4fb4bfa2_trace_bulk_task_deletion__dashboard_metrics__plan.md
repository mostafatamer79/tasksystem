---
type: "query"
date: "2026-09-05T16:14:44.629043+00:00"
question: "Trace bulk task deletion, dashboard metrics, plan task deduplication, and workflow templates"
contributor: "graphify"
outcome: "useful"
source_nodes: [".bulkDelete()", "dashboard/page.tsx", ".spawnAutomatedChildTask()", "workflow-templates.ts"]
---

# Q: Trace bulk task deletion, dashboard metrics, plan task deduplication, and workflow templates

## Answer

Expanded from original query via vocab: [task, tasks, bulk, delete, dashboard, plan, template, status, statuses, due, automated, workflow]. The graph identifies TasksController.bulkDelete at apps/api/src/tasks/tasks.controller.ts:L97, dashboard/page.tsx at apps/web/src/app/[locale]/(app)/dashboard/page.tsx:L1, WorkflowService.spawnAutomatedChildTask at apps/api/src/workflow/workflow.service.ts:L225, workflow-templates.ts at apps/api/src/workflow/workflow-templates.ts:L1, and shared Task/status types in apps/web/src/lib/types.ts. Direct source inspection is required because these files have uncommitted changes newer than the graph.

## Outcome

- Signal: useful

## Source Nodes

- .bulkDelete()
- dashboard/page.tsx
- .spawnAutomatedChildTask()
- workflow-templates.ts