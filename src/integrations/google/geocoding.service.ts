import {
  Injectable,
  UnprocessableEntityException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import { GeocodingResponse } from './geocoding.model';

@Injectable()
export class GoogleGeocodingService {
  private readonly logger = new Logger(GoogleGeocodingService.name);
  private readonly timeoutMs = 8000;

  /**
   * Geocode an address using Google Maps API.
   * @param address
   * @returns Geocoded location (latitude, longitude) and raw response
   */
  async geocode(address: string): Promise<{ lat: number; lng: number; raw: GeocodingResponse }> {
    const key = process.env.GOOGLE_GEOCODING_API_KEY;
    if (!key) throw new Error('GOOGLE_GEOCODING_API_KEY missing');

    const normalized = address?.trim();
    if (!normalized) {
      throw new UnprocessableEntityException('Address is required');
    }

    let res: { status: number; data: GeocodingResponse };
    try {
      res = await axios.get<GeocodingResponse>('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: normalized, key },
        timeout: this.timeoutMs,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('GoogleGeocodingService - Error calling provider', msg);
      throw new BadGatewayException('Geocoding provider unavailable');
    }

    if (!res.data.results?.length || !res.data.results?.[0]?.geometry?.location ) {
      this.logger.error(`GoogleGeocodingService - Unexpected response status ${res.status}`);
      throw new UnprocessableEntityException('Geocoding provider returned an unexpected response');
    }

    const first = res.data.results?.[0];
    const loc = first?.geometry?.location;

    const lat = Number(loc?.lat);
    const lng = Number(loc?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      this.logger.warn('GoogleGeocodingService - Address could not be geocoded', { lat: loc?.lat, lng: loc?.lng });
      throw new UnprocessableEntityException('Address could not be geocoded');
    }

    return { lat, lng, raw: res.data };
  }
}