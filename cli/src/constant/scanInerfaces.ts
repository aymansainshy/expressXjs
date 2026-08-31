export interface ScanConfig {
  sourceDir: string;
  outDir: string;
}

export interface FileCache {
  version: string;
  decoratorFiles: CachedFileMetadata[];
  totalScanned: number;
  generatedAt: string;
  environment: 'development' | 'production';
}


export interface CachedFileMetadata {
  path: string;
  mtime: number;
  size: number;
  hash?: string; // MD5 or xxHash of decorator lines only
}