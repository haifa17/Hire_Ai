import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is required to initialize Prisma.');
    }

    const isProd =
      (configService.get<string>('app.nodeEnv') ?? 'development') ===
      'production';
    const adapter = new PrismaPg({ connectionString });

    super({
      adapter,
      log: isProd
        ? [{ emit: 'stdout', level: 'error' }]
        : [
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to the database…');
    await this.$connect();
    this.logger.log('Database connected successfully.');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from the database…');
    await this.$disconnect();
  }
}
