import { Priority, Role } from '@prisma/client';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  defaultTitle?: string;
  defaultDueDays?: number;
  defaultPriority?: Priority;
  icon?: string;
  triggerStatus: 'COMPLETED' | 'TESTING' | 'PUBLISHED';
  requiresPublishing: boolean;
  nextTasks: WorkflowTemplateTask[];
}

export const TOMORROW_APPOINTMENTS_TEMPLATE_ID = 'tomorrow-appointments';
export const TOMORROW_APPOINTMENTS_TITLE = 'مواعيد بكرا';

export interface WorkflowTemplateTask {
  title: string;
  description?: string;
  assigneeRole?: Role;
  dueDays?: number;
  priority?: Priority;
  requiresPublishing?: boolean;
  condition?: 'ON_SUCCESS' | 'ON_RETURN';
  nextTasks?: WorkflowTemplateTask[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: TOMORROW_APPOINTMENTS_TEMPLATE_ID,
    name: TOMORROW_APPOINTMENTS_TITLE,
    description: 'Create or refresh tomorrow appointments without duplicating the active task in the same plan.',
    defaultTitle: TOMORROW_APPOINTMENTS_TITLE,
    defaultDueDays: 1,
    defaultPriority: Priority.MEDIUM,
    triggerStatus: 'COMPLETED',
    requiresPublishing: true,
    nextTasks: [],
  },
  {
    id: 'lesson-plan-review',
    name: 'Lesson Plan Review & Publish',
    description: 'Employee drafts a lesson plan, a moderator reviews it, then media is attached before final publishing.',
    triggerStatus: 'COMPLETED',
    requiresPublishing: false,
    nextTasks: [
      {
        title: 'Review Lesson Plan',
        description: 'Review the drafted lesson plan and approve or request changes.',
        assigneeRole: Role.MODERATOR,
        dueDays: 2,
        priority: Priority.HIGH,
        nextTasks: [
          {
            title: 'Attach Media & Resources',
            description: 'Attach slides, videos, and handouts to the approved lesson plan.',
            assigneeRole: Role.EMPLOYEE,
            dueDays: 3,
            priority: Priority.MEDIUM,
            requiresPublishing: true,
          },
        ],
      },
    ],
  },
  {
    id: 'curriculum-approval',
    name: 'Curriculum Approval',
    description: 'Write curriculum, peer review, final edit, and publish.',
    triggerStatus: 'COMPLETED',
    requiresPublishing: false,
    nextTasks: [
      {
        title: 'Peer Review Curriculum',
        description: 'Peer review the curriculum draft for accuracy and completeness.',
        assigneeRole: Role.EMPLOYEE,
        dueDays: 2,
        priority: Priority.HIGH,
        nextTasks: [
          {
            title: 'Final Curriculum Edit',
            description: 'Incorporate peer feedback and finalize the curriculum.',
            assigneeRole: Role.EMPLOYEE,
            dueDays: 2,
            priority: Priority.HIGH,
            requiresPublishing: true,
          },
        ],
      },
    ],
  },
  {
    id: 'multimedia-lesson',
    name: 'Multimedia Lesson Production',
    description: 'Prepare content, then create slides and record video in parallel before publishing.',
    triggerStatus: 'COMPLETED',
    requiresPublishing: false,
    nextTasks: [
      {
        title: 'Create Lesson Slides',
        description: 'Design and create presentation slides for the lesson.',
        assigneeRole: Role.EMPLOYEE,
        dueDays: 2,
        priority: Priority.MEDIUM,
      },
      {
        title: 'Record Lesson Video',
        description: 'Record and edit the lesson video.',
        assigneeRole: Role.EMPLOYEE,
        dueDays: 3,
        priority: Priority.MEDIUM,
      },
    ],
  },
  {
    id: 'content-review-simple',
    name: 'Simple Content Review',
    description: 'Create content and send it directly to a moderator for review.',
    triggerStatus: 'COMPLETED',
    requiresPublishing: false,
    nextTasks: [
      {
        title: 'Review Content',
        description: 'Review submitted content and approve or return for changes.',
        assigneeRole: Role.MODERATOR,
        dueDays: 1,
        priority: Priority.HIGH,
      },
    ],
  },
  {
    id: 'publish-only',
    name: 'Direct Publishing',
    description: 'When this task is completed, a moderator publish task is created automatically.',
    triggerStatus: 'COMPLETED',
    requiresPublishing: true,
    nextTasks: [],
  },
];
