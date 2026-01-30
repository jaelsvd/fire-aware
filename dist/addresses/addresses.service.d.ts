import { Address } from './address.model';
import { GoogleGeocodingService } from '../integrations/google/geocoding.service';
import { FirmsService } from '../integrations/firms/firms.service';
export declare class AddressesService {
    private readonly addressModel;
    private readonly googleGeocodingService;
    private readonly firmsService;
    private readonly logger;
    constructor(addressModel: typeof Address, googleGeocodingService: GoogleGeocodingService, firmsService: FirmsService);
    create(addressText: string): Promise<Address>;
    private validateAndNormalize;
    private fetchGeocode;
    private parseGeocode;
    private validateCoordinates;
    private fetchAndAttachWildfire;
    findAllPaginated({ limit, offset }: {
        limit: number;
        offset: number;
    }): Promise<{
        total: number;
        limit: number;
        offset: number;
        items: Address[];
    }>;
    findById(id: string): Promise<Address>;
    refreshWildfiresForStaleAddresses(opts: {
        staleBefore: Date;
        limit: number;
    }): Promise<number>;
}
