import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service'; // ✅ named import
import { Address } from './address.model';
import { GoogleGeocodingService } from '../integrations/google/geocoding.service';
import { FirmsModule } from '../integrations/firms/firms.module';

@Module({
    imports: [
        SequelizeModule.forFeature([Address]),
        FirmsModule,
    ],
    controllers: [AddressesController],
    providers: [
        AddressesService,
        GoogleGeocodingService,
    ],
    exports: [AddressesService], // ✅ export so JobsModule can inject it
})
export class AddressesModule {}
