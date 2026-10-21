import '../../../frontend/src/setupTests';
import { beforeEach } from 'vitest';
import platformAxios from '../api/platformAxios';

// Canvas tests use the real catalog client with deterministic metadata, never
// a live server. Integration tests can supply their own adapter per request.
platformAxios.defaults.adapter = async (config) => {
  if (config.url === '/core/builder/meta/') return { status: 200, config, data: { kinds: [], blocks: [] } };
  if (config.url === '/core/builder/variables/') return { status: 200, config,
    data: [{ key: 'company', label: 'Company', variables: [{ token: 'company.name', label: 'Company Name', data_type: 'string' }] }] };
  throw new Error(`Unexpected HTTP request in unit test: ${config.url}`);
};
beforeEach(() => localStorage.clear());
