# Graph Report - taskSystem  (2026-09-05)

## Corpus Check
- 248 files · ~199,409 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1391 nodes · 3106 edges · 101 communities (62 shown, 33 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 133 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4999d106`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- .log
- TasksController
- cn
- users/page.tsx
- tasks/[id]/page.tsx
- dashboard/page.tsx
- UsersController
- .login
- NotificationsGateway
- useAuthStore
- src/components/ui/button.tsx
- app.module.ts
- users.service.ts
- CurrentUser
- task-detail-sheet.tsx
- devDependencies
- compilerOptions
- clean-code/package.json
- AuthUser
- dependencies
- WorkflowService
- scripts
- src/lib/types.ts
- DashboardController
- (app)/layout.tsx
- src/lib/utils.ts
- profile/page.tsx
- .legacy-scaffold/lib/types.ts
- compilerOptions
- dependencies
- devDependencies
- PrismaService
- NotificationsController
- use-tasks.ts
- task-form-dialog.tsx
- tasks.service.ts
- .legacy-scaffold/lib/schemas.ts
- routing.ts
- CreateUserDto
- use-users.ts
- hooks.ts
- Task Deletion, Dashboard Archive, and Tomorrow Appointments Design
- TaskStateMachine
- .legacy-scaffold/lib/api.ts
- scripts
- exclude
- web/package.json
- HttpExceptionFilter
- QueryNotificationsDto
- nest-cli.json
- api/package.json
- seed.ts
- AuditController
- LoginDto
- components/error-boundary.tsx
- use-notifications.ts
- ChangePasswordDto
- web/eslint.config.mjs
- status-badge.tsx
- LoggingInterceptor
- vercel.json
- priority-badge.tsx
- badge.tsx
- .legacy-scaffold/components/ui/button.tsx
- .legacy-scaffold/middleware.ts
- app/layout.tsx
- next.config.ts
- [locale]/page.tsx
- class-transformer
- @nestjs/config
- @nestjs/platform-socket.io
- @nestjs/schedule
- @nestjs/swagger
- @prisma/client
- socket.io
- clsx
- date-fns
- @dnd-kit/core
- @dnd-kit/utilities
- framer-motion
- @hookform/resolvers
- next
- next-themes
- react
- react-hook-form
- recharts
- socket.io-client
- sonner
- tailwind-merge
- zustand
- postcss.config.mjs
- Max
- Min
- ApiResponse
- HttpCode

## God Nodes (most connected - your core abstractions)
1. `cn()` - 139 edges
2. `AuthUser` - 37 edges
3. `useAuthStore` - 29 edges
4. `PrismaService` - 28 edges
5. `CurrentUser` - 26 edges
6. `PlansService` - 25 edges
7. `TasksController` - 25 edges
8. `Button` - 25 edges
9. `TasksService` - 24 edges
10. `PlansController` - 22 edges

## Surprising Connections (you probably didn't know these)
- `DraggableCard()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/app/[locale]/(app)/tasks/board/page.tsx → apps/web/src/lib/utils.ts
- `BoardColumn()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/app/[locale]/(app)/tasks/board/page.tsx → apps/web/src/lib/utils.ts
- `TimelineCard()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/plans/task-detail-sheet.tsx → apps/web/src/lib/utils.ts
- `Pill()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/shared/badges.tsx → apps/web/src/lib/utils.ts
- `PriorityBadge()` --calls--> `cn()`  [EXTRACTED]
  apps/web/.legacy-scaffold/components/priority-badge.tsx → apps/web/src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (101 total, 33 thin omitted)

### Community 0 - ".log"
Cohesion: 0.07
Nodes (43): CreatePlanDto, CreatePlanTaskDto, PlanNextTaskDefinitionDto, QueryPlansDto, ReturnPlanDto, ApiProperty, ApiPropertyOptional, IsBoolean (+35 more)

### Community 1 - "TasksController"
Cohesion: 0.07
Nodes (43): ApiResponse, CreateCommentDto, CreateTaskDto, NextTaskDefinitionDto, QueryTasksDto, ReturnTaskDto, ApiProperty, ApiPropertyOptional (+35 more)

### Community 2 - "cn"
Cohesion: 0.07
Nodes (38): Avatar, AvatarFallback, AvatarImage, Card, CardContent, CardDescription, CardFooter, CardHeader (+30 more)

### Community 3 - "users/page.tsx"
Cohesion: 0.07
Nodes (39): ProfilePage(), ResetPasswordDialog(), UserFormDialog(), UsersPage(), errorMessage(), useChangePassword(), useCreateUser(), useDeleteUser() (+31 more)

### Community 4 - "tasks/[id]/page.tsx"
Cohesion: 0.10
Nodes (34): actionForDrop(), BoardColumn(), BoardPage(), DraggableCard(), TaskCard(), commentSchema, returnSchema, TaskDetailPage() (+26 more)

### Community 5 - "dashboard/page.tsx"
Cohesion: 0.08
Nodes (33): AdminDashboard(), AttendanceWidget(), DateFilter, EmployeeDashboard(), EmployeeTaskCard(), EmployeeTasksStats(), formatDuration(), formatTime() (+25 more)

### Community 6 - "UsersController"
Cohesion: 0.13
Nodes (17): ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, Body, Controller, Delete, Get (+9 more)

### Community 7 - ".login"
Cohesion: 0.14
Nodes (17): AuthController, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, Body, Controller, Get (+9 more)

### Community 8 - "NotificationsGateway"
Cohesion: 0.09
Nodes (17): CronController, ApiOperation, ApiResponse, ApiTags, Controller, Get, DueTasksCron, Injectable (+9 more)

### Community 9 - "useAuthStore"
Cohesion: 0.12
Nodes (22): AuthState, useAuth, DashboardPage(), container, item, LoginForm(), api, API_URL (+14 more)

### Community 10 - "src/components/ui/button.tsx"
Cohesion: 0.10
Nodes (17): ConfirmDialogProps, EmptyStateProps, PaginationProps, PlansPage(), Props, State, Pagination(), PaginationProps (+9 more)

### Community 11 - "app.module.ts"
Cohesion: 0.09
Nodes (24): AttendanceModule, Module, AuditModule, Global, Module, AuthModule, Module, CommonModule (+16 more)

### Community 12 - "users.service.ts"
Cohesion: 0.09
Nodes (23): ApiOperation, ApiResponse, Get, Query, paginate(), Paginated, PaginationDto, ApiPropertyOptional (+15 more)

### Community 13 - "CurrentUser"
Cohesion: 0.19
Nodes (11): CurrentUser, Roles(), ROLES_KEY, AccessTokenPayload, JwtAuthGuard, Injectable, RolesGuard, Injectable (+3 more)

### Community 14 - "task-detail-sheet.tsx"
Cohesion: 0.13
Nodes (23): AssignedTasksList(), AssignedTasksListProps, CalendarDayCell(), CalendarDayCellProps, STATUS_DOT, PlanCalendar(), PlanCalendarProps, STATUS_ICON (+15 more)

### Community 15 - "devDependencies"
Cohesion: 0.07
Nodes (27): devDependencies, jest, @nestjs/cli, @nestjs/testing, prisma, ts-jest, ts-loader, ts-node (+19 more)

### Community 16 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 17 - "clean-code/package.json"
Cohesion: 0.07
Nodes (26): author, description, devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, globals (+18 more)

### Community 18 - "AuthUser"
Cohesion: 0.18
Nodes (14): AttendanceController, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, Controller, Get, HttpCode (+6 more)

### Community 19 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, bcrypt, class-validator, cookie-parser, helmet, @nestjs/common, @nestjs/core, @nestjs/jwt (+17 more)

### Community 20 - "WorkflowService"
Cohesion: 0.17
Nodes (7): BalancedAssignmentStrategy, Injectable, isNextTaskDefinitionArray(), NextTaskCondition, NextTaskDefinition, Injectable, WorkflowService

### Community 21 - "scripts"
Cohesion: 0.08
Nodes (24): @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, description, devDependencies, @commitlint/cli, @commitlint/config-conventional (+16 more)

### Community 22 - "src/lib/types.ts"
Cohesion: 0.10
Nodes (18): AdminCharts, AdminStats, AssignmentMode, Attendance, AttendancePause, EmployeeStats, NextTaskDefinition, NotificationsPage (+10 more)

### Community 23 - "DashboardController"
Cohesion: 0.16
Nodes (11): DashboardController, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, Controller, Get, Query (+3 more)

### Community 24 - "(app)/layout.tsx"
Cohesion: 0.13
Nodes (15): AppShell(), navItems, AppLayout(), Logo(), navItems, NavKey, ErrorBoundary, Avatar() (+7 more)

### Community 25 - "src/lib/utils.ts"
Cohesion: 0.16
Nodes (15): TaskTimeline(), NotificationsPage(), Column, DataTable(), DataTableProps, EmptyState(), EmptyStateProps, Timeline() (+7 more)

### Community 26 - "profile/page.tsx"
Cohesion: 0.16
Nodes (16): CompletedPerMonthChart(), PriorityBarsChart(), StatusDonutChart(), TasksPerEmployeeChart(), useChartTheme(), StatCard(), StatCardProps, ThemeOption() (+8 more)

### Community 27 - ".legacy-scaffold/lib/types.ts"
Cohesion: 0.10
Nodes (20): AdminCharts, AdminStats, AppNotification, AssignmentMode, AuditLog, Comment, EmployeeStats, LoginResponse (+12 more)

### Community 28 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+10 more)

### Community 29 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, axios, class-variance-authority, @dnd-kit/sortable, lucide-react, next-intl, react-day-picker, react-dom (+11 more)

### Community 30 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, eslint, eslint-config-next, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react (+11 more)

### Community 31 - "PrismaService"
Cohesion: 0.19
Nodes (5): AuditEntry, AuditService, Injectable, PrismaService, Injectable

### Community 32 - "NotificationsController"
Cohesion: 0.14
Nodes (11): NotificationsController, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, Controller, Get, Param (+3 more)

### Community 33 - "use-tasks.ts"
Cohesion: 0.15
Nodes (11): CreateTaskPayload, taskKeys, TransitionAction, useCreateTask(), useDeleteTask(), useInvalidateTasks(), useTaskTransition(), useUpdateProgress() (+3 more)

### Community 34 - "task-form-dialog.tsx"
Cohesion: 0.20
Nodes (15): assigneeLabel(), FlowTimelinePreview(), scalarToNextTasks(), TaskFormDialog(), TaskFormDialogProps, TRIGGER_STATUSES, Input, Label (+7 more)

### Community 35 - "tasks.service.ts"
Cohesion: 0.28
Nodes (6): AssignmentStrategy, TxClient, MockEmployee, ManualAssignmentStrategy, Injectable, taskInclude

### Community 36 - ".legacy-scaffold/lib/schemas.ts"
Cohesion: 0.12
Nodes (15): ChangePasswordInput, changePasswordSchema, CommentInput, commentSchema, CreateUserInput, createUserSchema, LoginInput, loginSchema (+7 more)

### Community 37 - "routing.ts"
Cohesion: 0.18
Nodes (9): inter, metadata, Providers(), { Link, redirect, usePathname, useRouter, getPathname }, routing, config, intlMiddleware, middleware() (+1 more)

### Community 38 - "CreateUserDto"
Cohesion: 0.28
Nodes (12): CreateUserDto, ResetPasswordDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsEmail, IsEnum, IsOptional (+4 more)

### Community 39 - "use-users.ts"
Cohesion: 0.23
Nodes (9): CreateUserPayload, useCreateUser(), useDeleteUser(), useInvalidateUsers(), userKeys, UserQuery, useSetUserActive(), useUpdateUser() (+1 more)

### Community 40 - "hooks.ts"
Cohesion: 0.44
Nodes (11): PlanDetailPage(), STATUS_COLORS, useBulkUpsertPlanTasks(), useDeletePlan(), useInvalidatePlans(), usePlan(), usePlanAction(), useRemoveAllPlanTasks() (+3 more)

### Community 41 - "Task Deletion, Dashboard Archive, and Tomorrow Appointments Design"
Cohesion: 0.15
Nodes (12): Assumptions, Bulk Delete Contract, Clear Entire Dashboard Archive, Compatibility and Migration, Dashboard Consistency, Error Handling and Authorization, Objective, Scope (+4 more)

### Community 42 - "TaskStateMachine"
Cohesion: 0.24
Nodes (4): EMPLOYEE_TRANSITIONS, MODERATOR_OR_ADMIN_TRANSITIONS, TaskStateMachine, Injectable

### Community 43 - ".legacy-scaffold/lib/api.ts"
Cohesion: 0.24
Nodes (6): api, API_URL, ApiError, ensureAccessToken(), refreshTokens(), setAccessToken()

### Community 44 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, prisma:generate, prisma:migrate, prisma:seed, start, start:dev, start:prod (+1 more)

### Community 45 - "exclude"
Cohesion: 0.22
Nodes (8): exclude, extends, node_modules, dist, prisma, **/*spec.ts, test, ./tsconfig.json

### Community 46 - "web/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 47 - "HttpExceptionFilter"
Cohesion: 0.32
Nodes (5): AppModule, Module, HttpExceptionFilter, bootstrap(), Catch

### Community 48 - "QueryNotificationsDto"
Cohesion: 0.29
Nodes (7): QueryNotificationsDto, ApiPropertyOptional, IsInt, IsOptional, Max, Min, Type

### Community 49 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 50 - "api/package.json"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 51 - "seed.ts"
Cohesion: 0.47
Nodes (4): main(), prisma, prisma, seedWorkflows()

### Community 52 - "AuditController"
Cohesion: 0.33
Nodes (5): AuditController, ApiBearerAuth, ApiTags, Controller, UseGuards

### Community 53 - "LoginDto"
Cohesion: 0.33
Nodes (5): LoginDto, ApiProperty, IsEmail, IsString, MinLength

### Community 54 - "components/error-boundary.tsx"
Cohesion: 0.33
Nodes (3): ErrorBoundary, Props, State

### Community 57 - "ChangePasswordDto"
Cohesion: 0.40
Nodes (4): ChangePasswordDto, ApiProperty, IsString, MinLength

### Community 58 - "web/eslint.config.mjs"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 59 - "status-badge.tsx"
Cohesion: 0.40
Nodes (3): config, STATUS_COLORS, StatusBadge()

### Community 61 - "vercel.json"
Cohesion: 0.50
Nodes (3): crons, $schema, version

### Community 62 - "priority-badge.tsx"
Cohesion: 0.50
Nodes (3): config, PRIORITY_COLORS, PriorityBadge()

### Community 63 - "badge.tsx"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 64 - ".legacy-scaffold/components/ui/button.tsx"
Cohesion: 0.67
Nodes (3): Button, ButtonProps, buttonVariants

## Knowledge Gaps
- **327 isolated node(s):** `prisma`, `prisma`, `EMPLOYEE_TRANSITIONS`, `MODERATOR_OR_ADMIN_TRANSITIONS`, `MockEmployee` (+322 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 524 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `.legacy-scaffold/components/ui/button.tsx`, `task-form-dialog.tsx`, `users/page.tsx`, `tasks/[id]/page.tsx`, `dashboard/page.tsx`, `hooks.ts`, `src/components/ui/button.tsx`, `task-detail-sheet.tsx`, `(app)/layout.tsx`, `src/lib/utils.ts`, `profile/page.tsx`, `status-badge.tsx`, `priority-badge.tsx`, `badge.tsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `AuthUser` connect `AuthUser` to `NotificationsController`, `.log`, `tasks.service.ts`, `UsersController`, `.login`, `CurrentUser`, `DashboardController`, `PrismaService`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `TasksController` connect `TasksController` to `tasks.service.ts`, `CurrentUser`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `prisma`, `prisma`, `EMPLOYEE_TRANSITIONS` to the rest of the system?**
  _327 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `.log` be split into smaller, more focused modules?**
  _Cohesion score 0.0696969696969697 - nodes in this community are weakly interconnected._
- **Should `TasksController` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06823529411764706 - nodes in this community are weakly interconnected._