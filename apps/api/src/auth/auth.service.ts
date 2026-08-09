import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type RefreshTokenPayload = {
  sub: string;
  sessionId: string;
};

type RefreshTokenData = {
  refreshToken: string;
  refreshSessionId: string;
  refreshExpiresAt: Date;
  tokenHash: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await argon2.hash(password);

    try {
      const issued = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name,
          },
        });

        const refresh = await this.createRefreshSession(tx, user.id);
        return { userId: user.id, ...refresh };
      });

      const accessToken = await this.signAccessToken(issued.userId);
      return { accessToken, ...issued };
    } catch (error) {
      if (this.isEmailUniqueViolation(error)) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const issued = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return this.createRefreshSession(tx, user.id);
    });

    const accessToken = await this.signAccessToken(user.id);
    return { accessToken, userId: user.id, ...issued };
  }

  async refresh(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);
    const now = new Date();
    const nextRefresh = await this.buildRefreshToken(payload.sub, now);
    const accessToken = await this.signAccessToken(payload.sub);

    await this.prisma.$transaction(async (tx) => {
      const session = await tx.refreshSession.findUnique({ where: { id: payload.sessionId } });
      if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= now) {
        throw new UnauthorizedException('Invalid refresh session');
      }

      const tokenValid = await this.verifyTokenHash(session.tokenHash, refreshToken);
      if (!tokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const revoked = await tx.refreshSession.updateMany({
        where: {
          id: session.id,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedException('Invalid refresh session');
      }

      await tx.refreshSession.create({
        data: {
          id: nextRefresh.refreshSessionId,
          userId: payload.sub,
          tokenHash: nextRefresh.tokenHash,
          expiresAt: nextRefresh.refreshExpiresAt,
        },
      });
    });

    return {
      accessToken,
      refreshToken: nextRefresh.refreshToken,
      refreshSessionId: nextRefresh.refreshSessionId,
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    let payload: RefreshTokenPayload;
    try {
      payload = this.verifyRefreshToken(refreshToken);
    } catch {
      return;
    }

    const session = await this.prisma.refreshSession.findUnique({ where: { id: payload.sessionId } });
    if (!session || session.userId !== payload.sub || session.revokedAt) {
      return;
    }

    const tokenValid = await this.verifyTokenHash(session.tokenHash, refreshToken);
    if (!tokenValid) {
      return;
    }

    await this.prisma.refreshSession.updateMany({
      where: { id: session.id, userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId?: string) {
    if (!userId) {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.prisma.user.findUnique({
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

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return user;
  }

  getRefreshTtlMs() {
    return this.getRefreshTtlSeconds() * 1000;
  }

  private async createRefreshSession(tx: Prisma.TransactionClient, userId: string) {
    const refresh = await this.buildRefreshToken(userId);

    await tx.refreshSession.create({
      data: {
        id: refresh.refreshSessionId,
        userId,
        tokenHash: refresh.tokenHash,
        expiresAt: refresh.refreshExpiresAt,
      },
    });

    return {
      refreshToken: refresh.refreshToken,
      refreshSessionId: refresh.refreshSessionId,
    };
  }

  private async buildRefreshToken(userId: string, now = new Date()): Promise<RefreshTokenData> {
    const refreshSessionId = randomUUID();
    const ttlSeconds = this.getRefreshTtlSeconds();
    const refreshExpiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    const refreshToken = this.jwtService.sign(
      { sub: userId, sessionId: refreshSessionId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') || 'dev-refresh-secret',
        expiresIn: ttlSeconds,
      },
    );
    const tokenHash = await argon2.hash(refreshToken);

    return { refreshToken, refreshSessionId, refreshExpiresAt, tokenHash };
  }

  private verifyRefreshToken(refreshToken: string): RefreshTokenPayload {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const payload = this.jwtService.verify<Partial<RefreshTokenPayload>>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') || 'dev-refresh-secret',
      });

      if (!payload?.sub || !payload.sessionId) {
        throw new Error('Refresh token payload is incomplete');
      }

      return { sub: payload.sub, sessionId: payload.sessionId };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async verifyTokenHash(tokenHash: string, refreshToken: string) {
    try {
      return await argon2.verify(tokenHash, refreshToken);
    } catch {
      return false;
    }
  }

  private signAccessToken(userId: string) {
    return this.jwtService.signAsync({ sub: userId, jti: randomUUID() });
  }

  private getRefreshTtlSeconds() {
    const value = (this.config.get<string>('JWT_REFRESH_TTL') || '30d').trim().toLowerCase();
    const match = /^(\d+)(s|m|h|d)$/.exec(value);
    if (!match) {
      throw new Error('JWT_REFRESH_TTL must use s, m, h, or d units');
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 60 * 60 : 24 * 60 * 60;
    const seconds = amount * multiplier;

    if (!Number.isSafeInteger(seconds) || seconds <= 0) {
      throw new Error('JWT_REFRESH_TTL must be a positive safe duration');
    }

    return seconds;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private isEmailUniqueViolation(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }

    const target = error.meta?.target;
    return Array.isArray(target) ? target.includes('email') : String(target).includes('email');
  }
}
