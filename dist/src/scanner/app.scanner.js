"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scanner = void 0;
const glob_1 = require("glob");
const path_1 = __importDefault(require("path"));
const tsyringe_1 = require("tsyringe");
const promises_1 = __importDefault(require("fs/promises"));
let Scanner = class Scanner {
    constructor() {
        // Define the "triggers" that make a file worth importing
        this.frameworkDecorators = [
            '@Application',
            '@Controller',
            '@GlobalErrorHandler',
        ];
    }
    async scanProject() {
        const rootDir = path_1.default.join(process.cwd(), 'src');
        // 1. Get all potential files
        const files = await (0, glob_1.glob)('**/*.ts', {
            cwd: rootDir,
            absolute: true,
            ignore: ['**/*.d.ts', '**/*.spec.ts', '**/*.test.ts']
        });
        const importPromises = files.map(async (file) => {
            try {
                // 2. Fast-read the file as text
                const content = await promises_1.default.readFile(file, 'utf8');
                // 3. Only import if it contains one of our decorators
                const shouldImport = this.frameworkDecorators.some(decorator => content.includes(decorator));
                if (shouldImport) {
                    return await import(file);
                }
            }
            catch (error) {
                // Silently skip files that aren't readable or fail text-check
            }
        });
        await Promise.all(importPromises);
    }
};
exports.Scanner = Scanner;
exports.Scanner = Scanner = __decorate([
    (0, tsyringe_1.injectable)()
], Scanner);
