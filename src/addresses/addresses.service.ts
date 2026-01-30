import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Address } from './address.model';
import { normalizeAddress } from './address-normalize';
import { GoogleGeocodingService } from '../integrations/google/geocoding.service';
import { FirmsService } from '../integrations/firms/firms.service';
import {Op} from "sequelize";

type GeocodeLocation = { lat?: number | string; lng?: number | string };
type GeocodeResultItem = { geometry?: { location?: GeocodeLocation } };
type GeocodeProviderResult = {
  lat?: number;
  lng?: number;
  raw?: object; // narrowed from `unknown` to `object`
  results?: GeocodeResultItem[];
  [k: string]: unknown;
};

type WildfireData = {
  count: number;
  records: unknown[];
  bbox?: string;
  rangeDays?: number;
};

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(
    @InjectModel(Address) private readonly addressModel: typeof Address,
    private readonly googleGeocodingService: GoogleGeocodingService,
    private readonly firmsService: FirmsService,
  ) {}

  /**
   * Create a new address.
   * 
   * This method will first check the cache for an existing address with the same normalized text.
   * If found, it will return the existing address. Otherwise, it will call Google Geocoding API to geocode the address.
   * If the geocoding succeeds, it will validate the coordinates and create a new address record.
   * If the geocoding fails, it will throw an exception.
   * 
   * Then it will call FIRMS API to fetch wildfire data for the address.
   * If the call succeeds, it will attach the wildfire data to the address record.
   * If the call fails, it will log a warning and continue.
   * 
   * The cache is implemented as a simple in-memory map.
   * 
   * After creating the address, it will return the newly created address record.
   * @see https://github.com/googlemaps/google-maps-services-js/blob/master/samples/geocoding.md
   * @see https://developers.google.com/maps/documentation/geocoding/overview
   * @see https://firms.modaps.eosdis.nasa.gov/api/
   * @param addressText
   */
  async create(addressText: string) {
    const addressNormalized = this.validateAndNormalize(addressText);

    const existing = await this.addressModel.findOne({
      where: { addressNormalized },
    });
    if (existing) {
      this.logger.log(
        `cache hit for address=${addressNormalized} id=${existing.id}`,
      );
      return existing;
    }

    this.logger.log(
      `cache miss, calling Google for address=${addressNormalized}`,
    );

    const geocode = await this.fetchGeocode(addressText, addressNormalized);
    const { lat, lng, raw } = this.parseGeocode(geocode, addressNormalized);
    this.validateCoordinates(lat, lng, addressNormalized);

    const payload: Partial<Address> & {
      geocodeRaw?: object;
      wildfireData?: WildfireData;
    } = {
      address: addressText,
      addressNormalized,
      latitude: lat,
      longitude: lng,
      geocodeRaw: raw,
      wildfireData: { count: 0, records: [], bbox: '', rangeDays: 7 },
    };

    // Cast through `unknown` -> `Address` so the compiler accepts the call without `any`
    const address = await this.addressModel.create(
      payload as unknown as Address,
    );

    if (!address || !address.id) {
      this.logger.error('Failed to create address', JSON.stringify(address));
      throw new InternalServerErrorException('Failed to create address');
    }

    await this.fetchAndAttachWildfire(address);

    this.logger.log(`saved address id=${address.id}`);
    return address;
  }

  /**
   * Validate and normalize an address.
   * @param addressText - The address text to validate and normalize
   * @returns The normalized address text
   * @throws BadRequestException if the address is invalid or could not be normalized
   * @private
   */
  private validateAndNormalize(addressText: string): string {
    if (!addressText || !addressText.trim()) {
      this.logger.error(
        `Invalid address input: ${JSON.stringify(addressText)}`,
      );
      throw new BadRequestException('Address is required');
    }

    const addressNormalized = normalizeAddress(addressText);
    if (!addressNormalized || !addressNormalized.trim()) {
      this.logger.error(
        `Address normalized to empty for input: ${addressText}`,
      );
      throw new BadRequestException('Address could not be normalized');
    }

    return addressNormalized;
  }

  /**
   * Fetch geocoding results from Google Geocoding API.
   * @param addressText - The address text to geocode
   * @param addressNormalized - The normalized address text
   * @returns The geocoding results
   * @throws InternalServerErrorException if the geocoding fails
   * @private
   */ 
  private async fetchGeocode(
    addressText: string,
    addressNormalized: string,
  ): Promise<GeocodeProviderResult> {
    try {
      const res = await this.googleGeocodingService.geocode(addressText);
      return res as GeocodeProviderResult;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Google geocoding failed for address=${addressNormalized}`,
        stack ?? msg,
      );
      throw new InternalServerErrorException('Failed to geocode address');
    }
  }

  /**
   * Parse geocoding results and extract coordinates.
   * @param geocode - The geocoding results
   * @param addressNormalized - The normalized address text
   * @returns The parsed coordinates
   * @throws UnprocessableEntityException if the geocoding results are invalid
   * @private
   */
  private parseGeocode(
    geocode: GeocodeProviderResult,
    addressNormalized: string,
  ): { lat: number; lng: number; raw: object } {
    const first = Array.isArray(geocode.results)
      ? geocode.results[0]
      : undefined;
    const latRaw = geocode.lat ?? first?.geometry?.location?.lat;
    const lngRaw = geocode.lng ?? first?.geometry?.location?.lng;
    const raw = geocode.raw ?? geocode;

    const hasResultsArray =
      Array.isArray(geocode.results) && geocode.results.length > 0;
    const hasDirectCoords = latRaw !== undefined && lngRaw !== undefined;

    if (!geocode || (!hasResultsArray && !hasDirectCoords)) {
      this.logger.warn(
        `Geocoding returned no usable results for address=${addressNormalized}`,
      );
      throw new UnprocessableEntityException('Address could not be geocoded');
    }

    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      this.logger.warn(
        `Geocoding returned non-finite coords for address=${addressNormalized}`,
      );
      throw new UnprocessableEntityException('Address could not be geocoded');
    }

    return { lat, lng, raw };
  }

  /**
   * Validate coordinates.
   * @param lat - The latitude coordinate
   * @param lng - The longitude coordinate
   * @param addressNormalized - The normalized address text
   * @throws UnprocessableEntityException if the coordinates are invalid
   * @private
   */
  private validateCoordinates(
    lat: number,
    lng: number,
    addressNormalized: string,
  ): void {
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      this.logger.error(
        `Invalid coordinates from geocoding for address=${addressNormalized} lat=${lat} lng=${lng}`,
      );
      throw new UnprocessableEntityException(
        'Geocoding returned invalid coordinates',
      );
    }

    if (lat === 0 && lng === 0) {
      this.logger.warn(
        `Geocoding returned 0,0 for address=${addressNormalized}`,
      );
      throw new UnprocessableEntityException(
        'Geocoding returned invalid coordinates',
      );
    }
  }

  /**
   * Fetch wildfire data for an address.
   * @param address - The address to fetch wildfire data for
   * @returns The wildfire data
   * @throws InternalServerErrorException if the call to FIRMS fails
   * @private
   */
  private async fetchAndAttachWildfire(address: Address): Promise<void> {
    this.logger.log(
      `calling FIRMS for lat=${address.latitude} lng=${address.longitude}`,
    );

    let wildfire: WildfireData | null = null;
    try {
      const res = await this.firmsService.fetchWildfires(
        address.latitude ?? 0,
        address.longitude ?? 0,
      );
      if (res && typeof res === 'object') {
        const count = (res as { count?: unknown }).count;
        const records = (res as { records?: unknown[] }).records ?? [];
        const bbox = (res as { bbox?: unknown }).bbox as string | undefined;
        const rangeDays = (res as { rangeDays?: unknown }).rangeDays as
          | number
          | undefined;
        wildfire = {
          count:
            typeof count === 'number'
              ? count
              : Array.isArray(records)
                ? records.length
                : 0,
          records,
          bbox,
          rangeDays,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('FIRMS fetch failed', msg);
    }

    if (wildfire) {
      address.wildfireData = wildfire as unknown as any;
      address.wildfireFetchedAt = new Date();
      this.logger.log(`final wildfireData.count=${wildfire.count}`);
      await address.save();
    }
  }

  /**
   * List all addresses with pagination.
   * @param limit - Maximum number of items to return
   * @param offset - Offset of the first item to return
   * @returns
   * @example
   *     "total": 1,
   *     "limit": 20,
   *     "offset": 0,
   *     "items": [...addresses]
   */
  async findAllPaginated({ limit, offset }: { limit: number; offset: number }) {
    const { rows, count } = await this.addressModel.findAndCountAll({
      attributes: ['id', 'address', 'latitude', 'longitude'],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    this.logger.log(
      `Found a total of ${count} Addresses with limit=${limit} offset=${offset}`,
    );

    return {
      total: count,
      limit,
      offset,
      items: rows,
    };
  }

  /**
   * Get an address by ID.
   * @param id - The ID of the address to get
   * @returns The address record
   * @throws NotFoundException if the address is not found
   * @example
   * const address = await controller.findById('123');
   */
  async findById(id: string) {
    const address = await this.addressModel.findByPk(id, {
      attributes: [
        'id',
        'address',
        'latitude',
        'longitude',
        'wildfireData',
      ],
    });

    if (!address) {
      this.logger.log(`Address not found id=${id}`);
      throw new NotFoundException('Address not found');
    }

    return address;
  }


  async refreshWildfiresForStaleAddresses(opts: { staleBefore: Date; limit: number }) {
    const { staleBefore, limit } = opts;

    const where: any = {
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null },
      [Op.or]: [
        { wildfireFetchedAt: null },
        { wildfireFetchedAt: { [Op.lt]: staleBefore } },
      ],
    };

    const rows = await this.addressModel.findAll({ where, order: [['wildfireFetchedAt', 'ASC']], limit });
    
    if (!rows.length) return 0;

    let updated = 0;

    for (const addr of rows) {
      try {
        const wildfire = await this.firmsService.fetchWildfires(addr.latitude!, addr.longitude!);
        addr.wildfireData = wildfire as any;
        addr.wildfireFetchedAt = new Date();
        await addr.save();
        updated++;
      } catch (err: any) {
        // Don’t fail the whole job because one address fails
        this.logger.warn(`Job refresh failed for addressId=${addr.id}: ${err?.message ?? String(err)}`);
      }
    }

    return updated;
  }
}
