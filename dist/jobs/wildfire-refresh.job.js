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
var WildfireRefreshJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WildfireRefreshJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const addresses_service_1 = require("../addresses/addresses.service");
let WildfireRefreshJob = WildfireRefreshJob_1 = class WildfireRefreshJob {
    addressesService;
    logger = new common_1.Logger(WildfireRefreshJob_1.name);
    staleHours = Number(process.env.WILDFIRE_REFRESH_STALE_HOURS ?? 24);
    batchSize = Number(process.env.WILDFIRE_REFRESH_BATCH_SIZE ?? 25);
    constructor(addressesService) {
        this.addressesService = addressesService;
    }
    async refreshStaleWildfires() {
        const staleBefore = new Date(Date.now() - this.staleHours * 60 * 60 * 1000);
        console.log('🔥🔥🔥 JOB TRIGGERED');
        this.logger.log('🔥 CRON TRIGGERED');
        this.logger.log(`Starting refresh: staleHours=${this.staleHours} batchSize=${this.batchSize} staleBefore=${staleBefore.toISOString()}`);
        const refreshed = await this.addressesService.refreshWildfiresForStaleAddresses({
            staleBefore,
            limit: this.batchSize,
        });
        this.logger.log(`Refresh done: updated=${refreshed}`);
    }
};
exports.WildfireRefreshJob = WildfireRefreshJob;
__decorate([
    (0, schedule_1.Cron)('0 */6 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WildfireRefreshJob.prototype, "refreshStaleWildfires", null);
exports.WildfireRefreshJob = WildfireRefreshJob = WildfireRefreshJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [addresses_service_1.AddressesService])
], WildfireRefreshJob);
//# sourceMappingURL=wildfire-refresh.job.js.map