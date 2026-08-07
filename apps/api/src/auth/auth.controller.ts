import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService, TokenPair } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login — sets httpOnly cookies and returns tokens' })
  @ApiResponse({ status: 200, description: 'Logged in; tokens returned and set as cookies' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    const tokens = await this.auth.issueTokens(user, req.ip, req.headers['user-agent']);
    this.setCookies(res, tokens);
    return { user: this.publicUser(user), ...tokens };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new token pair' })
  @ApiResponse({ status: 200, description: 'New token pair' })
  @ApiResponse({ status: 401, description: 'Invalid/expired refresh token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const header = req.headers.authorization;
    const token =
      cookies?.['refresh_token'] ??
      (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    const tokens = await this.auth.refresh(token, req.ip, req.headers['user-agent']);
    this.setCookies(res, tokens);
    return tokens;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — revokes refresh token and clears cookies' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    await this.auth.logout(user.id, cookies?.['refresh_token'], req.ip, req.headers['user-agent']);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password (revokes all sessions)' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    if (!user) throw new UnauthorizedException();
    await this.auth.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      req.ip,
      req.headers['user-agent'],
    );
    return { message: 'Password changed' };
  }

  private setCookies(res: Response, tokens: TokenPair) {
    const secure = this.config.get<string>('COOKIE_SECURE') === 'true';
    const base = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
    res.cookie('access_token', tokens.accessToken, {
      ...base,
      maxAge: this.config.get<number>('JWT_ACCESS_TTL', 900) * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...base,
      maxAge: this.config.get<number>('JWT_REFRESH_TTL', 604800) * 1000,
    });
  }

  private publicUser(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string | null;
    position: string | null;
    avatarUrl: string | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      avatarUrl: user.avatarUrl,
    };
  }
}
