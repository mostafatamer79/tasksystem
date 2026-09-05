ALTER TABLE "PlanTask" ADD COLUMN "workflowTemplateId" TEXT;
ALTER TABLE "Task" ADD COLUMN "workflowTemplateId" TEXT;

CREATE INDEX "PlanTask_planId_workflowTemplateId_idx"
  ON "PlanTask"("planId", "workflowTemplateId");
CREATE INDEX "Task_workflowTemplateId_idx"
  ON "Task"("workflowTemplateId");

UPDATE "PlanTask"
SET "workflowTemplateId" = 'tomorrow-appointments'
WHERE "planId" = '847379a2-018b-4dd1-be13-f7350673d2df'
  AND "taskId" IN (
    SELECT "id"
    FROM "Task"
    WHERE regexp_replace(btrim("title"), '\s+', ' ', 'g') = 'مواعيد بكرا'
  );

UPDATE "Task" AS task
SET "workflowTemplateId" = 'tomorrow-appointments'
WHERE regexp_replace(btrim(task."title"), '\s+', ' ', 'g') = 'مواعيد بكرا'
  AND EXISTS (
    SELECT 1
    FROM "PlanTask" AS plan_task
    WHERE plan_task."taskId" = task."id"
      AND plan_task."planId" = '847379a2-018b-4dd1-be13-f7350673d2df'
      AND plan_task."workflowTemplateId" = 'tomorrow-appointments'
  );
