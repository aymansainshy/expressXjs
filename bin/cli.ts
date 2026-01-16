#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

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
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    fs.writeFileSync(path.join(targetDir, fileName), template.trim());
    console.log(`Created controller: ${fileName}`);
  });

program.parse(process.argv);