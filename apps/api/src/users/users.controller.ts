import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.create(dto, actor.id);
  }

  @Get()
  @ApiOperation({ summary: 'List users — paginated, search/filter/sort (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  findAll(@Query() query: QueryUsersDto) {
    return this.users.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.update(id, dto, actor.id);
  }

  @Patch(':id/disable')
  @ApiOperation({ summary: 'Disable a user and revoke sessions (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'User disabled' })
  disable(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.users.setActive(id, false, actor.id);
  }

  @Patch(':id/enable')
  @ApiOperation({ summary: 'Enable a user (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'User enabled' })
  enable(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.users.setActive(id, true, actor.id);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset a user password (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Password reset' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: AuthUser,
  ) {
    await this.users.resetPassword(id, dto.newPassword, actor.id);
    return { message: 'Password reset' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user (ADMIN only) — fails while tasks reference the user' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 400, description: 'User has referenced tasks or is self' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    await this.users.remove(id, actor.id);
    return { message: 'User deleted' };
  }
}
