#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const program = new commander_1.Command();
program
    .version('1.0.0')
    .description('ExpressX Framework CLI');
program
    .command('make:controller <name>')
    .description('Create a new controller')
    .action((name) => {
    const fileName = `${name.toLowerCase()}.controller.ts`;
    const className = name.charAt(0).toUpperCase() + name.slice(1) + 'Controller';
    const template = `
import { Controller, Get } from '@expressx/core';
import { Request, Response } from 'express';

@Controller('/${name.toLowerCase()}')
export class ${className} {
    @Get('/')
    public index(req: Request, res: Response) {
        res.json({ message: 'Hello from ${className}' });
    }
}
`;
    const targetDir = path.join(process.cwd(), 'src', 'controllers');
    if (!fs.existsSync(targetDir))
        fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, fileName), template.trim());
    console.log(`Created controller: ${fileName}`);
});
program.parse(process.argv);
