import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    return this.issueTokens(user.id);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string) {
    const payload = this.jwtService.verify<{ sub: string; sessionId?: string }>(refreshToken, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') || 'dev-refresh-secret',
    });

    if (!payload?.sub || !payload?.sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.refreshSession.findUnique({ where: { id: payload.sessionId } });
    if (!session || session.userId !== payload.sub || session.revokedAt) {
      throw new UnauthorizedException('Invalid refresh session');
    }

    const now = new Date();
    if (session.expiresAt < now) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const tokenValid = await argon2.verify(session.tokenHash, refreshToken);
    if (!tokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshSession.updateMany({
      where: { userId: payload.sub, id: { not: session.id } },
      data: { revokedAt: now },
    });

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: now },
    });

    const nextSession = await this.prisma.refreshSession.create({
      data: {
        userId: payload.sub,
        tokenHash: 'pending',
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const newToken = this.signRefreshToken(payload.sub, nextSession.id);
    const newHash = await argon2.hash(newToken);
    await this.prisma.refreshSession.update({
      where: { id: nextSession.id },
      data: { tokenHash: newHash },
    });

    const accessToken = await this.jwtService.signAsync({ sub: payload.sub });

    return {
      accessToken,
      refreshToken: newToken,
      refreshSessionId: nextSession.id,
    };
  }

  async logout(userId?: string, sessionId?: string) {
    if (!userId || !sessionId) {
      return;
    }

    await this.prisma.refreshSession.updateMany({
      where: { userId, id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId?: string) {
    if (!userId) {
      return null;
    }

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  private async issueTokens(userId: string) {
    const session = await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const refreshToken = this.signRefreshToken(userId, session.id);
    const refreshHash = await argon2.hash(refreshToken);
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { tokenHash: refreshHash },
    });

    const accessToken = await this.jwtService.signAsync({ sub: userId });

    return {
      accessToken,
      refreshToken,
      refreshSessionId: session.id,
    };
  }

  private signRefreshToken(userId: string, sessionId: string) {
    const payload = { sub: userId, sessionId };
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') || 'dev-refresh-secret',
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') || '30d',
    });
  }
}
