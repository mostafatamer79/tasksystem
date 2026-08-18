import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async issueTokens(user: User, ip?: string, userAgent?: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: Number(this.config.get('JWT_ACCESS_TTL') ?? 900),
      },
    );

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const refreshTtl = this.config.get<number>('JWT_REFRESH_TTL', 604800);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'Auth',
      entityId: user.id,
      ip,
      userAgent,
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string | undefined, ip?: string, userAgent?: string): Promise<TokenPair> {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (!stored.user.isActive) throw new UnauthorizedException('User disabled');

    // Rotate: revoke old, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(stored.user, ip, userAgent);
  }

  async logout(userId: string, refreshToken: string | undefined, ip?: string, userAgent?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash: this.hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.audit.log({ userId, action: 'LOGOUT', entity: 'Auth', entityId: userId, ip, userAgent });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Invalidate all refresh tokens on password change
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    this.audit.log({
      userId,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: userId,
      ip,
      userAgent,
    });
  }

  async resetAdminCredentials() {
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    if (!admin) {
      throw new BadRequestException('No admin user found');
    }

    const defaultEmail = 'admin@example.com';
    const defaultPassword = 'Admin123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await this.prisma.user.update({
      where: { id: admin.id },
      data: {
        email: defaultEmail,
        passwordHash,
      },
    });

    return { message: 'Admin credentials reset to admin@example.com / Admin123!' };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
