import { Model } from 'sequelize-typescript';
type FirmsRecordJson = {
    area: string;
    data_availability: string;
    kml_fire_footprints: Record<string, string[]>;
    map_key: string;
    missing_dates: string[];
};
export declare class Address extends Model<Address> {
    id: string;
    address: string;
    latitude?: number;
    longitude?: number;
    wildfireData: {
        count: number;
        records: FirmsRecordJson[];
        bbox: string;
        rangeDays: number;
    };
    geocodeRaw?: object;
    wildfireFetchedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    addressNormalized: string;
}
export {};
