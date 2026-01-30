"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FirmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirmsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let FirmsService = FirmsService_1 = class FirmsService {
    http;
    logger = new common_1.Logger(FirmsService_1.name);
    timeoutMs = 8000;
    bboxPrecision = 6;
    constructor(http) {
        this.http = http;
    }
    bboxFromLatLng(lat, lng, delta) {
        const west = (lng - delta).toFixed(this.bboxPrecision);
        const south = (lat - delta).toFixed(this.bboxPrecision);
        const east = (lng + delta).toFixed(this.bboxPrecision);
        const north = (lat + delta).toFixed(this.bboxPrecision);
        return `${west},${south},${east},${north}`;
    }
    async fetchCsv(mapKey, source, bbox, dayRange) {
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bbox}/${dayRange}`;
        let res;
        try {
            res = (await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                responseType: 'text',
                timeout: this.timeoutMs,
            })));
        }
        catch (err) {
            this.logger.error('FIRMS fetchCsv network error', err?.stack ?? err?.message ?? String(err));
            throw new common_1.BadGatewayException('Failed to fetch CSV from FIRMS');
        }
        if (res.status !== 200 || res.data == null) {
            this.logger.error('FIRMS fetchCsv unexpected response', {
                url,
                status: res.status,
            });
            throw new common_1.BadGatewayException('FIRMS returned unexpected response');
        }
        return String(res.data);
    }
    async fetchWildfires(lat, lng) {
        const mapKey = process.env.FIRMS_MAP_KEY;
        if (!mapKey) {
            throw new common_1.InternalServerErrorException('FIRMS_MAP_KEY missing');
        }
        const source = process.env.FIRMS_SOURCE || 'VIIRS_SNPP_NRT';
        const delta = Number(process.env.FIRMS_BBOX_DELTA ?? 0.1);
        const bbox = this.bboxFromLatLng(lat, lng, delta);
        const rangeDays = 7;
        try {
            const [csv5, csv2] = await Promise.all([
                this.fetchCsv(mapKey, source, bbox, 5),
                this.fetchCsv(mapKey, source, bbox, 2),
            ]);
            const records = [
                ...this.parseCsv(csv5),
                ...this.parseCsv(csv2),
            ];
            this.logger.log(`FIRMS source=${source} bbox=${bbox} records=${records.length}`);
            return {
                count: records.length,
                records,
                bbox,
                rangeDays,
                source,
            };
        }
        catch (err) {
            this.logger.error(`FIRMS fetchWildfires failed bbox=${bbox}`, err?.stack ?? err?.message ?? String(err));
            if (err instanceof common_1.HttpException) {
                throw err;
            }
            throw new common_1.BadGatewayException('Failed to fetch wildfire data from FIRMS');
        }
    }
    parseCsv(csvText) {
        if (!csvText || !csvText.trim())
            return [];
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length < 2)
            return [];
        const headers = this.parseCsvLine(lines[0]).map(h => h.trim());
        const records = [];
        for (const rawLine of lines.slice(1)) {
            const line = rawLine.trim();
            if (!line)
                continue;
            const values = this.parseCsvLine(line).map(v => v.trim());
            const obj = {};
            for (let i = 0; i < headers.length; i++) {
                obj[headers[i]] = values[i] ?? '';
            }
            if (!obj.latitude || !obj.longitude)
                continue;
            records.push(obj);
        }
        return records;
    }
    parseCsvLine(line) {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (inQuotes) {
                if (char === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        cur += '"';
                        i++;
                    }
                    else {
                        inQuotes = false;
                    }
                }
                else {
                    cur += char;
                }
            }
            else {
                if (char === '"') {
                    inQuotes = true;
                }
                else if (char === ',') {
                    result.push(cur);
                    cur = '';
                }
                else {
                    cur += char;
                }
            }
        }
        result.push(cur);
        return result;
    }
};
exports.FirmsService = FirmsService;
exports.FirmsService = FirmsService = FirmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], FirmsService);
//# sourceMappingURL=firms.service.js.map