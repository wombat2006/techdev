"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpstashRedisService = exports.getRedisService = void 0;
const globals_1 = require("@jest/globals");
exports.getRedisService = globals_1.jest.fn();
class UpstashRedisService {
    constructor(...args) {
        return (0, exports.getRedisService)(...args);
    }
}
exports.UpstashRedisService = UpstashRedisService;
//# sourceMappingURL=redis-service.js.map