import { Module } from '@nestjs/common';
import { WildfireRefreshJob } from './wildfire-refresh.job';
import { AddressesModule } from '../addresses/addresses.module';

@Module({
    imports: [AddressesModule], 
    providers: [WildfireRefreshJob],
})
export class JobsModule {}
