"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const controller_decorator_1 = require("./controller.decorator");
describe('Controller decorator', () => {
    it('should define controller metadata', () => {
        let UserController = class UserController {
        };
        UserController = __decorate([
            (0, controller_decorator_1.Controller)('/users')
        ], UserController);
        const path = Reflect.getMetadata(controller_decorator_1.CONTROLLER_METADATA, UserController);
        expect(path).toBe('/users');
    });
});
