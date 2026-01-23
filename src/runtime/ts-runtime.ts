/**
 * @fileoverview ts-runtime.ts
 * Sets up the TypeScript runtime environment for the application.
 * This includes registering ts-node and tsconfig-paths to enable
 * on-the-fly TypeScript compilation and path alias resolution based on
 * the tsconfig.json file .
 * 
 * @license MIT 
 * @author Ayman Abdulrahman.
 */
import 'reflect-metadata';

require('ts-node/register');
require('tsconfig-paths/register');
