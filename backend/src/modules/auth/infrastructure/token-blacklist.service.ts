import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlacklistedTokenDocument } from './blacklisted-token.schema';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(
    @InjectModel(BlacklistedTokenDocument.name)
    private readonly model: Model<BlacklistedTokenDocument>,
  ) {}

  async add(token: string, expiresAtMs: number): Promise<void> {
    try {
      await this.model.create({
        token,
        expiresAt: new Date(expiresAtMs),
      });
    } catch (err: any) {
      // Ignore duplicate key error (token already blacklisted)
      if (err?.code !== 11000) {
        this.logger.error(`Failed to blacklist token: ${err.message}`);
      }
    }
  }

  async has(token: string): Promise<boolean> {
    // We only need to check if it exists in DB.
    // Expired tokens are automatically removed by MongoDB TTL index.
    const count = await this.model.countDocuments({ token });
    return count > 0;
  }
}
