import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { paginate, Paginated } from '../common/dto/pagination.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  position: true,
  isActive: true,
  avatarUrl: true,
  workStartTime: true,
  workEndTime: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { password: _, ...data } = dto;
    const user = await this.prisma.user.create({ data: { ...data, passwordHash }, select: publicSelect });
    this.audit.log({ userId: actorId, action: 'USER_CREATE', entity: 'User', entityId: user.id });
    return user;
  }

  async findAll(query: QueryUsersDto): Promise<Paginated<PublicUser>> {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.department ? { department: query.department } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const allowedSort = ['name', 'email', 'createdAt', 'updatedAt', 'role'];
    const sortBy = query.sortBy && allowedSort.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [sortBy]: query.sortOrder },
        select: publicSelect,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    await this.ensureExists(id);
    if (dto.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (conflict && conflict.id !== id) throw new ConflictException('Email already in use');
    }
    const user = await this.prisma.user.update({ where: { id }, data: dto, select: publicSelect });
    this.audit.log({
      userId: actorId,
      action: 'USER_UPDATE',
      entity: 'User',
      entityId: id,
      metadata: dto as unknown as Prisma.InputJsonValue,
    });
    return user;
  }

  async setActive(id: string, isActive: boolean, actorId: string) {
    await this.ensureExists(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: publicSelect,
    });
    if (!isActive) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.audit.log({
      userId: actorId,
      action: isActive ? 'USER_ENABLE' : 'USER_DISABLE',
      entity: 'User',
      entityId: id,
    });
    return user;
  }

  async resetPassword(id: string, newPassword: string, actorId: string) {
    await this.ensureExists(id);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    this.audit.log({ userId: actorId, action: 'USER_RESET_PASSWORD', entity: 'User', entityId: id });
  }

  async remove(id: string, actorId: string) {
    await this.ensureExists(id);
    if (id === actorId) throw new BadRequestException('You cannot delete your own account');
    const taskCount = await this.prisma.task.count({
      where: { OR: [{ assignedToId: id }, { createdById: id }] },
    });
    if (taskCount > 0) {
      throw new BadRequestException(
        'User has referenced tasks — reassign or delete them first (or disable the user instead)',
      );
    }
    await this.prisma.user.delete({ where: { id } });
    this.audit.log({ userId: actorId, action: 'USER_DELETE', entity: 'User', entityId: id });
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('User not found');
  }
}
