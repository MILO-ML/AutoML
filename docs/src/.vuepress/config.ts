import { backToTopPlugin } from '@vuepress/plugin-back-to-top';
import { mediumZoomPlugin } from '@vuepress/plugin-medium-zoom';
import { defaultTheme, defineUserConfig } from 'vuepress';
import { description, version } from '../../package.json';

export default defineUserConfig({
  base: '/docs/',
  lang: 'en-US',
  title: `Machine Intelligence Learning Optimizer (MILO-ML) Documentation (v${version})`,
  description,
  dest: '../static/docs',
  head: [
    ['meta', { name: 'theme-color', content: '#3880ff' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],
  theme: defaultTheme({
    repo: '',
    editLinks: false,
    contributors: false,
    docsDir: '',
    editLinkText: '',
    lastUpdated: false,
    plugins: [backToTopPlugin(), mediumZoomPlugin()],
    navbar: [
      {
        text: 'Auto-ML Guide',
        link: '/auto-ml-guide/',
      },
      {
        text: 'Processor Guide',
        link: '/processor-guide/',
      },
      {
        text: 'Install Guide',
        link: '/install-guide/'
      }
    ],
    sidebar: [
      {
        text: 'Install Guide',
        link: '/install-guide/',
        children: [
          '/install-guide/',
          '/install-guide/docker',
          '/install-guide/firewall'
        ]
      },
      {
        text: 'Processor Guide',
        link: '/processor-guide/',
        children: [
          '/processor-guide/',
          '/processor-guide/train-test-builder',
          '/processor-guide/general',
          '/processor-guide/multicollinearity',
          '/processor-guide/feature-selector',
          '/processor-guide/column-reducer',
        ]
      },
      {
        text: 'Auto-ML Guide',
        link: '/auto-ml-guide/',
        children: [
          '/auto-ml-guide/',
          '/auto-ml-guide/get-started',
          '/auto-ml-guide/dataset-preparation',
          '/auto-ml-guide/homepage',
          '/auto-ml-guide/selecting-dataset',
          '/auto-ml-guide/analyzing-dataset',
          '/auto-ml-guide/model-building',
          '/auto-ml-guide/run-status',
          '/auto-ml-guide/model-results',
          '/auto-ml-guide/test-model',
          '/auto-ml-guide/publish-model',
          '/auto-ml-guide/conclusion',
          '/auto-ml-guide/glossary-terms',
          '/auto-ml-guide/glossary-report-export',
          '/auto-ml-guide/glossary-performance-export',
          '/auto-ml-guide/sample-datasets',
          '/auto-ml-guide/acknowledgments'
        ]
      }
    ]
  })
});
