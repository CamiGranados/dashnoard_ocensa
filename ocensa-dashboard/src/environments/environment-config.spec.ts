import { describe, expect, it } from 'vitest';
import angularConfig from '../../angular.json';
import proxyConfig from '../../proxy.conf.json';
import { environment as defaultEnvironment } from './environment';
import { environment as developmentEnvironment } from './environment.development';
import { environment as productionEnvironment } from './environment.production';

describe('environment API routing', () => {
  it('keeps every browser build on the same-origin /api path', () => {
    expect(defaultEnvironment.apiUrl).toBe('/api');
    expect(developmentEnvironment.apiUrl).toBe('/api');
    expect(productionEnvironment.apiUrl).toBe('/api');
  });

  it('routes npm start through the versioned Angular development proxy', () => {
    const serve = angularConfig.projects['ocensa-dashboard'].architect.serve;
    expect(serve.defaultConfiguration).toBe('development');
    expect(serve.configurations.development.proxyConfig).toBe('proxy.conf.json');
    expect(proxyConfig['/api']).toEqual({
      target: 'http://localhost:5285',
      secure: false,
      changeOrigin: true,
      logLevel: 'warn',
    });
  });
});
