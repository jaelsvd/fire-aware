import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import  { AddressesService }  from '../addresses/addresses.service';

@Injectable()
export class WildfireRefreshJob {
    private readonly logger = new Logger(WildfireRefreshJob.name);

    private readonly staleHours = Number(process.env.WILDFIRE_REFRESH_STALE_HOURS ?? 24);
    private readonly batchSize = Number(process.env.WILDFIRE_REFRESH_BATCH_SIZE ?? 25);

    constructor(private readonly addressesService: AddressesService) {}

    // Every 6 hours
    @Cron('0 */6 * * *')
   // @Cron('*/10 * * * * *') // every 10 seconds for testing
    async refreshStaleWildfires() {
        const staleBefore = new Date(Date.now() - this.staleHours * 60 * 60 * 1000);
        console.log('🔥🔥🔥 JOB TRIGGERED');
        this.logger.log('🔥 CRON TRIGGERED');
        this.logger.log(
            `Starting refresh: staleHours=${this.staleHours} batchSize=${this.batchSize} staleBefore=${staleBefore.toISOString()}`,
        );

        // We’ll call a service method to keep a job thin.
        const refreshed = await this.addressesService.refreshWildfiresForStaleAddresses({
            staleBefore,
            limit: this.batchSize,
        });

        this.logger.log(`Refresh done: updated=${refreshed}`);
    }
}
