import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Switchboard',
  description: 'Code-first contact center Framework for Amazon Connect',
  base: '/switchboard-docs/', // GitHub Pages path

  // Ignore dead links in planning documents and incomplete pages
  ignoreDeadLinks: true,

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Building', link: '/building/flows' },
      { text: 'Reference', link: '/reference/stack' },
      { text: 'Examples', link: '/examples/minimal-setup' },
      { text: 'GitHub', link: 'https://github.com/nicksoftware/AmazonConnectBuilderFramework' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Why This Framework?', link: '/guide/why' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Installation', link: '/guide/installation' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Architecture Overview', link: '/guide/architecture' },
            { text: 'Framework Patterns', link: '/guide/patterns' },
            { text: 'Dynamic Configuration', link: '/guide/dynamic-configuration' },
            { text: 'Fluent API Design', link: '/guide/fluent-api' },
            { text: 'Attribute-Based Design', link: '/guide/attributes' }
          ]
        },
        {
          text: 'Building Flows',
          items: [
            { text: 'Flow Basics', link: '/guide/flows/basics' },
            { text: 'Fluent API', link: '/guide/flows/fluent-builders' },
            { text: 'Customer Input Handling', link: '/guide/flows/input-handling' },
            { text: 'Speech Recognition (ASR)', link: '/guide/flows/speech-recognition' },
            { text: 'Advanced Prompts', link: '/guide/flows/prompts' },
            { text: 'Dynamic Attributes', link: '/guide/flows/dynamic-attributes' },
            { text: 'Attribute-Based Flows', link: '/guide/flows/attribute-based' },
            { text: 'Flow Validation', link: '/guide/flows/validation' }
          ]
        },
        {
          text: 'Advanced Features',
          items: [
            { text: 'Source Generators', link: '/guide/advanced/source-generators' },
            { text: 'Roslyn Analyzers', link: '/guide/advanced/analyzers' },
            { text: 'Dependency Injection', link: '/guide/advanced/dependency-injection' },
            { text: 'Middleware Pipeline', link: '/guide/advanced/middleware' }
          ]
        },
        {
          text: 'Deployment',
          items: [
            { text: 'Environment Configuration', link: '/guide/deployment/environments' },
            { text: 'CI/CD Pipelines', link: '/guide/deployment/cicd' },
            { text: 'Security Best Practices', link: '/guide/deployment/security' },
            { text: 'Monitoring & Observability', link: '/guide/deployment/monitoring' }
          ]
        }
      ],

      '/examples/': [
        {
          text: 'Setup Examples',
          items: [
            { text: 'Single-File Quick Setup', link: '/examples/single-file-setup' },
            { text: 'Minimal Setup', link: '/examples/minimal-setup' },
            { text: 'Basic Call Center', link: '/examples/basic-call-center' },
            { text: 'Multi-Queue Setup', link: '/examples/multi-queue' }
          ]
        },
        {
          text: 'Production Examples',
          items: [
            { text: 'Enterprise (Attribute-Based)', link: '/examples/enterprise-attributes' },
            { text: 'Enterprise (Fluent Builders)', link: '/examples/enterprise-fluent' },
            { text: 'Existing Instance Migration', link: '/examples/existing-instance' },
            { text: 'Multi-Region Deployment', link: '/examples/multi-region' },
            { text: 'High-Volume Center', link: '/examples/high-volume' }
          ]
        },
        {
          text: 'Flow Patterns',
          items: [
            { text: 'Customer Authentication', link: '/examples/flows/authentication' },
            { text: 'IVR Menu Systems', link: '/examples/flows/ivr-menu' },
            { text: 'Multi-Tenant Architecture', link: '/examples/flows/multi-tenant' },
            { text: 'Callback Flows', link: '/examples/flows/callback' },
            { text: 'After Hours Handling', link: '/examples/flows/after-hours' }
          ]
        }
      ],

      '/building/': [
        {
          text: 'Building Guides',
          items: [
            { text: 'Contact Flows', link: '/building/flows' },
            { text: 'Queues', link: '/building/queues' },
            { text: 'Routing Profiles', link: '/building/routing-profiles' },
            { text: 'Hours of Operation', link: '/building/hours-of-operation' },
            { text: 'Users (Agents)', link: '/building/users' },
            { text: 'Complete Example', link: '/building/complete-example' }
          ]
        }
      ],

      '/reference/': [
        {
          text: 'Core Reference',
          items: [
            { text: 'Attributes', link: '/reference/attributes' },
            { text: 'Source Generators', link: '/reference/source-generators' },
            { text: 'Roslyn Analyzers', link: '/reference/analyzers' }
          ]
        },
        {
          text: 'API Reference',
          items: [
            { text: 'SwitchboardStack', link: '/reference/stack' },
            { text: 'Flow Actions', link: '/reference/flow-actions' },
            { text: 'Configuration', link: '/reference/configuration' },
            { text: 'Input Configuration', link: '/reference/input-configuration' },
            { text: 'Prompt Configuration', link: '/reference/prompt-configuration' }
          ]
        },
        {
          text: 'Extensions',
          items: [
            { text: 'Dependency Injection', link: '/reference/extensions/dependency-injection' },
            { text: 'Assembly Scanning', link: '/reference/extensions/assembly-scanning' },
            { text: 'Stack Extensions', link: '/reference/extensions/stack-extensions' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nicksoftware/AmazonConnectBuilderFramework' }
    ],

    footer: {
      message: 'Preview release - Licensing terms TBD before 1.0',
      copyright: 'Copyright © 2025 Nicksoftware'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/nicksoftware/AmazonConnectBuilderFramework/edit/main/docs/:path'
    }
  }
})
