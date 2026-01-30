import {
  Injectable,
  Logger,
  BadGatewayException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { AxiosResponse } from 'axios';

type CsvRecord = Record<string, string>;

@Injectable()
export class FirmsService {
  private readonly logger = new Logger(FirmsService.name);
  private readonly timeoutMs = 8000;
  private readonly bboxPrecision = 6;

  constructor(private readonly http: HttpService) {}

  // FIRMS expect: west,south,east,north
  private bboxFromLatLng(lat: number, lng: number, delta: number): string {
    const west = (lng - delta).toFixed(this.bboxPrecision);
    const south = (lat - delta).toFixed(this.bboxPrecision);
    const east = (lng + delta).toFixed(this.bboxPrecision);
    const north = (lat + delta).toFixed(this.bboxPrecision);
    return `${west},${south},${east},${north}`;
  }

  /**
   * Fetch CSV data from FIRMS.
   * @param mapKey - Map key for the FIRMS API.
   * @param source - Source to fetch data from.
   * @param bbox - Bounding box to fetch data for.
   * @param dayRange - Number of days to fetch data for.
   * @returns CSV data as a string.
   * @example "latitude,longitude,acq_date,acq_time,confidence,fmc_state,fmc_number,fire_name,size_class,size_class_flag"
   * @private
   */
  private async fetchCsv(
      mapKey: string,
      source: string,
      bbox: string,
      dayRange: number,
  ): Promise<string> {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bbox}/${dayRange}`;

    let res: AxiosResponse<string>;
    try {
      res = (await firstValueFrom(
          this.http.get<string>(url, {
            responseType: 'text' as const,
            timeout: this.timeoutMs,
          }),
      )) as AxiosResponse<string>;
    } catch (err: any) {
      this.logger.error('FIRMS fetchCsv network error', err?.stack ?? err?.message ?? String(err));
      throw new BadGatewayException('Failed to fetch CSV from FIRMS');
    }

    if (res.status !== 200 || res.data == null) {
      this.logger.error('FIRMS fetchCsv unexpected response', {
        url,
        status: res.status,
      });
      throw new BadGatewayException('FIRMS returned unexpected response');
    }

    return String(res.data);
  }

  /**
   * Fetch wildfire data from FIRMS.
   * @param lat Latitude of the location to fetch wildfires for.
   * @param lng Longitude of the location to fetch wildfires for.
   * @returns Object containing wildfire data.
   * @example
   * 
   * {
   *   count: 123,
   *   records: [...wildfires], 
   *   bbox: 'west,south,east,north',
   *   rangeDays: 7,
   *   source: 'VIIRS_SNPP_NRT'
   * }
   */
  async fetchWildfires(lat: number, lng: number) {
    const mapKey = process.env.FIRMS_MAP_KEY;
    if (!mapKey) {
      throw new InternalServerErrorException('FIRMS_MAP_KEY missing');
    }

    const source = process.env.FIRMS_SOURCE || 'VIIRS_SNPP_NRT';
    const delta = Number(process.env.FIRMS_BBOX_DELTA ?? 0.1);
    const bbox = this.bboxFromLatLng(lat, lng, delta);
    const rangeDays = 7;

    try {
      // FIRMS max = 5 days → split request
      const [csv5, csv2] = await Promise.all([
        this.fetchCsv(mapKey, source, bbox, 5),
        this.fetchCsv(mapKey, source, bbox, 2),
      ]);

      const records = [
        ...this.parseCsv(csv5),
        ...this.parseCsv(csv2),
      ];

      this.logger.log(
          `FIRMS source=${source} bbox=${bbox} records=${records.length}`,
      );

      return {
        count: records.length,
        records,
        bbox,
        rangeDays,
        source,
      };
    } catch (err: any) {
      this.logger.error(
          `FIRMS fetchWildfires failed bbox=${bbox}`,
          err?.stack ?? err?.message ?? String(err),
      );

      // Do not wrap intentional HttpExceptions
      if (err instanceof HttpException) {
        throw err;
      }

      throw new BadGatewayException('Failed to fetch wildfire data from FIRMS');
    }
  }

  /**
   * Parse CSV data into an array of objects.
   * @param csvText
   * @returns Array of objects with keys matching the CSV headers.
   * @private
   */
  private parseCsv(csvText: string): CsvRecord[] {
    if (!csvText || !csvText.trim()) return [];

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]).map(h => h.trim());
    const records: CsvRecord[] = [];

    for (const rawLine of lines.slice(1)) {
      const line = rawLine.trim();
      if (!line) continue;

      const values = this.parseCsvLine(line).map(v => v.trim());
      const obj: CsvRecord = {};

      for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = values[i] ?? '';
      }

      // Ignore rows without coordinates
      if (!obj.latitude || !obj.longitude) continue;

      records.push(obj);
    }

    return records;
  }

  /** Minimal CSV parser supporting quoted fields
   * 
   * @param line
   * @returns Array of fields, quoted fields are returned as-is.
   * @private
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(cur);
          cur = '';
        } else {
          cur += char;
        }
      }
    }

    result.push(cur);
    return result;
  }
}
