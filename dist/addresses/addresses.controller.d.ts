import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
export declare class AddressesController {
    private readonly addressesService;
    private readonly logger;
    constructor(addressesService: AddressesService);
    create(dto: CreateAddressDto): Promise<import("./address.model").Address>;
    list(limit?: string, offset?: string): Promise<{
        total: number;
        limit: number;
        offset: number;
        items: import("./address.model").Address[];
    }>;
    findOne(id: string): Promise<import("./address.model").Address>;
}
