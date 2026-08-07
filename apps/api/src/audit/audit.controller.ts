import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Paginated audit log list' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN only' })
  async list(@Query() query: PaginationDto) {
    const orderBy = query.sortBy
      ? { [query.sortBy]: query.sortOrder }
      : { createdAt: query.sortOrder };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip: query.skip,
        take: query.limit,
        orderBy,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);
    return paginate(data, total, query);
  }
}
