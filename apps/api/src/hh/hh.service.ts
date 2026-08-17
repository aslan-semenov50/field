import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { HhCallbackQueryDto } from './dto/hh-callback-query.dto';

const HH_AUTHORIZE_URL = 'https://hh.ru/oauth/authorize';
const HH_TOKEN_URL = 'https://api.hh.ru/token';
const HH_ME_URL = 'https://api.hh.ru/me';
const HH_REQUEST_TIMEOUT_MS = 10_000;

export const HH_OAUTH_STATE_COOKIE = 'hhOAuthState';
export const HH_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type CallbackOutcome = 'connected' | 'denied' | 'failed';

type HhTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

@Injectable()
export class HhService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async status(userId: string) {
    const connection = await this.prisma.hhConnection.findUnique({
      where: { userId },
      select: {
        hhUserId: true,
        connectedAt: true,
      },
    });

    if (!connection) {
      return { connected: false as const };
    }

    return {
      connected: true as const,
      hhUserId: connection.hhUserId,
      connectedAt: connection.connectedAt,
    };
  }

  async connect(userId: string) {
    const oauth = this.oauthConfig();
    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(48).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier, 'ascii')
      .digest('base64url');
    const stateHash = this.hashState(state);
    const codeVerifierCiphertext = this.encrypt(codeVerifier, `pkce:${userId}`);
    const expiresAt = new Date(Date.now() + HH_OAUTH_STATE_TTL_MS);

    await this.prisma.hhOAuthState.upsert({
      where: { userId },
      create: {
        userId,
        stateHash,
        codeVerifierCiphertext,
        expiresAt,
      },
      update: {
        stateHash,
        codeVerifierCiphertext,
        expiresAt,
      },
    });

    const authorizationUrl = new URL(HH_AUTHORIZE_URL);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('client_id', oauth.clientId);
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('redirect_uri', oauth.redirectUri);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    authorizationUrl.searchParams.set('role', 'applicant');
    authorizationUrl.searchParams.set('force_role', 'true');

    return { authorizationUrl: authorizationUrl.toString(), state };
  }

  async handleCallback(
    query: HhCallbackQueryDto,
    cookieState: string | undefined,
  ): Promise<CallbackOutcome> {
    if (!query.state || !cookieState || !this.statesMatch(query.state, cookieState)) {
      throw new BadRequestException('Invalid HeadHunter OAuth state');
    }

    const { oauthState, claimHash } = await this.claimState(query.state);

    if (oauthState.expiresAt.getTime() <= Date.now()) {
      await this.releaseClaim(claimHash, oauthState.userId);
      throw new BadRequestException('HeadHunter OAuth state expired');
    }

    if (query.error) {
      await this.releaseClaim(claimHash, oauthState.userId);
      if (query.code) {
        throw new BadRequestException('Invalid HeadHunter OAuth callback');
      }

      return 'denied';
    }

    if (!query.code) {
      await this.releaseClaim(claimHash, oauthState.userId);
      throw new BadRequestException('HeadHunter authorization code is required');
    }

    let issuedAccessToken: string | null = null;

    try {
      const codeVerifier = this.decrypt(
        oauthState.codeVerifierCiphertext,
        `pkce:${oauthState.userId}`,
      );
      const token = await this.exchangeCode(query.code, codeVerifier);
      issuedAccessToken = token.accessToken;
      const hhUserId = await this.fetchCurrentHhUserId(token.accessToken);
      const connectedAt = new Date();
      const accessTokenCiphertext = this.encrypt(
        token.accessToken,
        `access:${oauthState.userId}`,
      );
      const refreshTokenCiphertext = this.encrypt(
        token.refreshToken,
        `refresh:${oauthState.userId}`,
      );
      const accessTokenExpiresAt = new Date(
        connectedAt.getTime() + token.expiresIn * 1000,
      );

      const connected = await this.prisma.$transaction(async (tx) => {
        const claim = await tx.hhOAuthState.deleteMany({
          where: { stateHash: claimHash, userId: oauthState.userId },
        });

        if (claim.count !== 1) {
          return false;
        }

        await tx.hhConnection.upsert({
          where: { userId: oauthState.userId },
          create: {
            userId: oauthState.userId,
            hhUserId,
            accessTokenCiphertext,
            refreshTokenCiphertext,
            accessTokenExpiresAt,
            connectedAt,
          },
          update: {
            hhUserId,
            accessTokenCiphertext,
            refreshTokenCiphertext,
            accessTokenExpiresAt,
            connectedAt,
          },
        });

        return true;
      });

      if (!connected) {
        await this.revokeAccessToken(token.accessToken);
        issuedAccessToken = null;
        return 'failed';
      }

      issuedAccessToken = null;
      return 'connected';
    } catch (error) {
      if (issuedAccessToken) {
        await this.revokeAccessToken(issuedAccessToken);
      }
      await this.releaseClaim(claimHash, oauthState.userId).catch(() => undefined);

      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        return 'failed';
      }

      throw error;
    }
  }

  frontendRedirect(outcome: CallbackOutcome) {
    const configuredOrigin =
      this.config.get<string>('CORS_ORIGIN')?.trim() || 'http://localhost:5173';

    try {
      const redirect = new URL('/', configuredOrigin);
      if (!['http:', 'https:'].includes(redirect.protocol)) {
        throw new Error('Unsupported protocol');
      }
      redirect.searchParams.set('hh', outcome);
      return redirect.toString();
    } catch {
      throw new ServiceUnavailableException('FIELD frontend origin is invalid');
    }
  }

  async disconnect(userId: string) {
    await this.prisma.hhOAuthState.deleteMany({ where: { userId } });

    const connection = await this.prisma.hhConnection.findUnique({
      where: { userId },
      select: { accessTokenCiphertext: true },
    });

    if (!connection) {
      return;
    }

    try {
      const accessToken = this.decrypt(
        connection.accessTokenCiphertext,
        `access:${userId}`,
      );
      await this.revokeAccessToken(accessToken);
    } catch {
      // Local disconnect still removes credentials if decryption or HH is unavailable.
    }

    await this.prisma.hhConnection.deleteMany({ where: { userId } });
  }

  private async claimState(state: string) {
    const claimHash = this.hashState(randomBytes(32).toString('base64url'));

    try {
      const oauthState = await this.prisma.hhOAuthState.update({
        where: { stateHash: this.hashState(state) },
        data: { stateHash: claimHash },
      });

      return { oauthState, claimHash };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new BadRequestException('Invalid HeadHunter OAuth state');
      }

      throw error;
    }
  }

  private async releaseClaim(stateHash: string, userId: string) {
    await this.prisma.hhOAuthState.deleteMany({
      where: { stateHash, userId },
    });
  }

  private async exchangeCode(code: string, codeVerifier: string) {
    const oauth = this.oauthConfig();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: oauth.clientId,
      client_secret: oauth.clientSecret,
      redirect_uri: oauth.redirectUri,
      code,
      code_verifier: codeVerifier,
    });

    let response: Response;
    try {
      response = await fetch(HH_TOKEN_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'HH-User-Agent': oauth.userAgent,
        },
        body,
        signal: AbortSignal.timeout(HH_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new BadGatewayException('HeadHunter token exchange failed');
    }

    if (!response.ok) {
      throw new BadGatewayException('HeadHunter token exchange failed');
    }

    const payload = await this.jsonObject(response, 'HeadHunter token response');
    const accessToken = payload.access_token;
    const refreshToken = payload.refresh_token;
    const tokenType = payload.token_type;
    const expiresIn = payload.expires_in;

    if (
      typeof accessToken !== 'string' ||
      accessToken.length === 0 ||
      typeof refreshToken !== 'string' ||
      refreshToken.length === 0 ||
      typeof tokenType !== 'string' ||
      tokenType.toLowerCase() !== 'bearer' ||
      !Number.isSafeInteger(expiresIn) ||
      (expiresIn as number) <= 0
    ) {
      throw new BadGatewayException('Invalid HeadHunter token response');
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresIn as number,
    } satisfies HhTokenResponse;
  }

  private async fetchCurrentHhUserId(accessToken: string) {
    let response: Response;
    try {
      response = await fetch(HH_ME_URL, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'HH-User-Agent': this.requiredConfig('HH_USER_AGENT'),
        },
        signal: AbortSignal.timeout(HH_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new BadGatewayException('HeadHunter user request failed');
    }

    if (!response.ok) {
      throw new BadGatewayException('HeadHunter user request failed');
    }

    const payload = await this.jsonObject(response, 'HeadHunter user response');
    if (
      typeof payload.id !== 'string' ||
      payload.id.length === 0 ||
      payload.auth_type !== 'applicant'
    ) {
      throw new BadGatewayException('Invalid HeadHunter user response');
    }

    return payload.id;
  }

  private async revokeAccessToken(accessToken: string) {
    try {
      await fetch(HH_TOKEN_URL, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'HH-User-Agent': this.requiredConfig('HH_USER_AGENT'),
        },
        signal: AbortSignal.timeout(HH_REQUEST_TIMEOUT_MS),
      });
    } catch {
      // Revocation is best-effort; no token value is logged or returned.
    }
  }

  private async jsonObject(response: Response, label: string) {
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      throw new BadGatewayException(`${label} is not JSON`);
    }

    try {
      const value: unknown = await response.json();
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Expected an object');
      }
      return value as Record<string, unknown>;
    } catch {
      throw new BadGatewayException(`${label} is invalid`);
    }
  }

  private oauthConfig() {
    return {
      clientId: this.requiredConfig('HH_CLIENT_ID'),
      clientSecret: this.requiredConfig('HH_CLIENT_SECRET'),
      redirectUri: this.requiredConfig('HH_REDIRECT_URI'),
      userAgent: this.requiredConfig('HH_USER_AGENT'),
    };
  }

  private requiredConfig(name: string) {
    const value = this.config.get<string>(name)?.trim();
    if (!value) {
      throw new ServiceUnavailableException('HeadHunter integration is not configured');
    }
    return value;
  }

  private encryptionKey() {
    const encodedKey = this.requiredConfig('HH_TOKEN_ENCRYPTION_KEY');
    const key = Buffer.from(encodedKey, 'base64');
    if (key.length !== 32) {
      throw new ServiceUnavailableException(
        'HeadHunter token encryption key is invalid',
      );
    }
    return key;
  }

  private encrypt(value: string, purpose: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    cipher.setAAD(Buffer.from(purpose, 'utf8'));
    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [iv, tag, ciphertext]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  private decrypt(value: string, purpose: string) {
    const parts = value.split('.');
    if (parts.length !== 3) {
      throw new ServiceUnavailableException('HeadHunter token storage is invalid');
    }

    try {
      const [iv, tag, ciphertext] = parts.map((part) =>
        Buffer.from(part, 'base64url'),
      );
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), iv);
      decipher.setAAD(Buffer.from(purpose, 'utf8'));
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException('HeadHunter token storage is invalid');
    }
  }

  private hashState(state: string) {
    return createHash('sha256').update(state, 'ascii').digest('hex');
  }

  private statesMatch(queryState: string, cookieState: string) {
    const queryBuffer = Buffer.from(queryState, 'utf8');
    const cookieBuffer = Buffer.from(cookieState, 'utf8');
    return (
      queryBuffer.length === cookieBuffer.length &&
      timingSafeEqual(queryBuffer, cookieBuffer)
    );
  }
}
