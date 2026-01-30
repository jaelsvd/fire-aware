import { GeocodingResponse } from './geocoding.model';
export declare class GoogleGeocodingService {
    private readonly logger;
    private readonly timeoutMs;
    geocode(address: string): Promise<{
        lat: number;
        lng: number;
        raw: GeocodingResponse;
    }>;
}
