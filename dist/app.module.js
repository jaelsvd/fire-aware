"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sequelize_1 = require("@nestjs/sequelize");
const addresses_module_1 = require("./addresses/addresses.module");
const jobs_module_1 = require("./jobs/jobs.module");
const schedule_1 = require("@nestjs/schedule");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            addresses_module_1.AddressesModule,
            jobs_module_1.JobsModule,
            sequelize_1.SequelizeModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    dialect: 'postgres',
                    host: config.get('DB_HOST'),
                    port: Number(config.get('DB_PORT')),
                    database: config.get('DB_NAME'),
                    username: config.get('DB_USER'),
                    password: config.get('DB_PASSWORD'),
                    autoLoadModels: true,
                    synchronize: false,
                    logging: false,
                }),
            }),
            addresses_module_1.AddressesModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map