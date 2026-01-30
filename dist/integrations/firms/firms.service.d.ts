import { HttpService } from '@nestjs/axios';
type CsvRecord = Record<string, string>;
export declare class FirmsService {
    private readonly http;
    private readonly logger;
    private readonly timeoutMs;
    private readonly bboxPrecision;
    constructor(http: HttpService);
    private bboxFromLatLng;
    private fetchCsv;
    fetchWildfires(lat: number, lng: number): Promise<{
        count: number;
        records: CsvRecord[];
        bbox: string;
        rangeDays: number;
        source: string;
    }>;
    private parseCsv;
    private parseCsvLine;
}
export {};
