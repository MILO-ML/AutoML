const { description } = require('../../package')
const { version } = require('../../../package')

module.exports = {
  base: '/docs/',

  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: `MILO: Machine Intelligence Learning Optimizer Documentation (v${version})`,
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
        link: '/guide/',
      }
    ],
    sidebar: {
      '/guide/': [
        {
          title: 'Guide',
          collapsable: false,
          children: [
            '',
            'get-started',
            'dataset-preparation',
            'homepage',
            'selecting-dataset',
            'analyzing-dataset',
            'model-building',
            'run-status',
            'model-results',
            'test-model',
            'publish-model',
            'conclusion',
            'glossary-terms',
            'sample-datasets'
          ]
        }
      ],
    }
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