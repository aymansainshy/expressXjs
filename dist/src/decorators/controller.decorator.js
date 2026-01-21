"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerRegistry = exports.CONTROLLER_METADATA = void 0;
exports.Controller = Controller;
const tsyringe_1 = require("tsyringe");
exports.CONTROLLER_METADATA = Symbol('CONTROLLER_METADATA');
class ControllerRegistry {
    static add(target) {
        if (!this.controllers.includes(target))
            this.controllers.push(target);
    }
}
exports.ControllerRegistry = ControllerRegistry;
ControllerRegistry.controllers = [];
function Controller(path = '') {
    return (target) => {
        (0, tsyringe_1.injectable)()(target);
        Reflect.defineMetadata(exports.CONTROLLER_METADATA, path, target);
        ControllerRegistry.add(target);
    };
}
