import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(Role.ADMIN)
  @Get('stats/overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get platform-wide overview statistics' })
  getOverviewStats() {
    return this.adminService.getOverviewStats();
  }

  @Roles(Role.ADMIN)
  @Get('stats/applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get application status breakdown' })
  getApplicationStatusBreakdown() {
    return this.adminService.getApplicationStatusBreakdown();
  }

  @Roles(Role.ADMIN)
  @Get('stats/signups')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get monthly user signups for the last N months' })
  getMonthlySignups(@Query('months') months?: string) {
    const parsed = months ? parseInt(months, 10) : undefined;
    return this.adminService.getMonthlySignups(
      Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
    );
  }

  @Roles(Role.ADMIN)
  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recent system alerts (pending job reports)' })
  getRecentAlerts(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : undefined;
    return this.adminService.getRecentAlerts(
      Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
    );
  }
}
