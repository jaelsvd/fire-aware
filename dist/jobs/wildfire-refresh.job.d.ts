import { AddressesService } from '../addresses/addresses.service';
export declare class WildfireRefreshJob {
    private readonly addressesService;
    private readonly logger;
    private readonly staleHours;
    private readonly batchSize;
    constructor(addressesService: AddressesService);
    refreshStaleWildfires(): Promise<void>;
}
