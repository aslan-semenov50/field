import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HhCallbackQueryDto } from './dto/hh-callback-query.dto';
import {
  HH_OAUTH_STATE_COOKIE,
  HH_OAUTH_STATE_TTL_MS,
  HhService,
} from './hh.service';

@ApiTags('integrations')
@Controller('integrations/hh')
export class HhController {
  constructor(private readonly hhService: HhService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current user's HeadHunter connection status" })
  status(@Req() req: Request) {
    return this.hhService.status(req.user!.sub);
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start HeadHunter OAuth connection' })
  async connect(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.hhService.connect(req.user!.sub);

    res.cookie(HH_OAUTH_STATE_COOKIE, result.state, {
      ...this.oauthCookieOptions(),
      maxAge: HH_OAUTH_STATE_TTL_MS,
    });

    return { authorizationUrl: result.authorizationUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Complete HeadHunter OAuth connection' })
  async callback(
    @Query() query: HhCallbackQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const outcome = await this.hhService.handleCallback(
      query,
      req.cookies?.[HH_OAUTH_STATE_COOKIE],
    );
    res.clearCookie(HH_OAUTH_STATE_COOKIE, this.oauthCookieOptions());
    return res.redirect(HttpStatus.FOUND, this.hhService.frontendRedirect(outcome));
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Disconnect the current user's HeadHunter account" })
  async disconnect(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.hhService.disconnect(req.user!.sub);
    } finally {
      res.clearCookie(HH_OAUTH_STATE_COOKIE, this.oauthCookieOptions());
    }
  }

  private oauthCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax' as const,
      path: '/integrations/hh/callback',
    };
  }
}
