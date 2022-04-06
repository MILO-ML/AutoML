const { description } = require('../../package')
const { version } = require('../../../package')

module.exports = {
  base: '/docs/',

  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: `Machine Intelligence Learning Optimizer (MILO-ML) Documentation (v${version})`,
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: description,

  dest: '../static/docs',

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', { name: 'theme-color', content: '#3880ff' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
  themeConfig: {
    repo: '',
    editLinks: false,
    docsDir: '',
    editLinkText: '',
    lastUpdated: false,
    nav: [
      {
        text: 'User Guide',
        link: '/user-guide/',
      },
      {
        text: 'Install Guide',
        link: '/install-guide/'
      }
    ],
    sidebar: [
      {
        title: 'Install Guide',
        path: '/install-guide/',
        collapsable: false,
        children: [
          '/install-guide/',
          '/install-guide/docker',
          '/install-guide/firewall'
        ]
      },
      {
        title: 'User Guide',
        path: '/user-guide/',
        collapsable: false,
        children: [
          '/user-guide/',
          '/user-guide/get-started',
          '/user-guide/dataset-preparation',
          '/user-guide/homepage',
          '/user-guide/selecting-dataset',
          '/user-guide/analyzing-dataset',
          '/user-guide/model-building',
          '/user-guide/run-status',
          '/user-guide/model-results',
          '/user-guide/test-model',
          '/user-guide/publish-model',
          '/user-guide/conclusion',
          '/user-guide/glossary-terms',
          '/user-guide/glossary-report-export',
          '/user-guide/glossary-performance-export',
          '/user-guide/sample-datasets',
          '/user-guide/acknowledgments'
        ]
      }
    ]
  },

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
    '@snowdog/vuepress-plugin-pdf-export',
  ]
}
