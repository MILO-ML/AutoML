import { environment as defaults } from './environment.default';

export const environment = {
  ...defaults,
  name: 'web',
  apiUrl: 'https://api.milo-ml.com',
  production: true,
  authOnly: true
};
