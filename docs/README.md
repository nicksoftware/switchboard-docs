# Switchboard Documentation

This directory contains the complete documentation for the Switchboard, built with [VitePress](https://vitepress.dev/).

## Running the Documentation Site Locally

### Prerequisites

- Node.js 20+ installed
- npm or yarn

### Development

```bash
# Install dependencies (first time only)
npm install

# Start dev server
npm run docs:dev

# Open http://localhost:5173 in your browser
```

### Building for Production

```bash
# Build static site
npm run docs:build

# Preview production build
npm run docs:preview
```

## Documentation Structure

```
docs/
├── .vitepress/
│   └── config.mts          # VitePress configuration
├── guide/                  # User guides
│   ├── introduction.md     # What is the framework?
│   ├── quick-start.md      # Get started in 5 minutes
│   ├── patterns.md         # Design patterns used
│   ├── flows/             # Flow-building guides
│   ├── advanced/          # Advanced features
│   └── deployment/        # Deployment guides
├── examples/              # Code examples
│   ├── minimal-setup.md   # Simple examples
│   ├── enterprise.md      # Production examples
│   └── flows/            # Flow patterns
├── api/                   # API reference
│   ├── flow-blocks.md    # Complete block reference
│   ├── blocks/           # Individual block docs
│   └── core/             # Core API docs
└── index.md              # Home page
```

## Original Planning Documents

The `docs/` folder also contains original planning documents (numbered):

- `00-PROJECT-HUB.md` - Project overview and goals
- `02-ARCHITECTURE-PATTERNS.md` - Legacy (see guide/patterns.md instead)
- `03-DYNAMIC-CONFIGURATION.md` - DynamoDB config strategy
- `04-LANGUAGE-PERFORMANCE.md` - .NET 10 performance analysis
- `05-PROJECT-SETUP.md` - Initial setup guide
- `06-FRAMEWORK-ARCHITECTURE.md` - Architecture decisions
- `07-ADVANCED-DOTNET-ARCHITECTURE.md` - Advanced .NET features
- `08-PRODUCTION-EXAMPLES.md` - Production deployment patterns
- `09-FLOW-BLOCKS-REFERENCE.md` - Flow block reference

These are being reorganized into the VitePress site structure.

## Contributing to Documentation

### Adding a New Page

1. Create a new `.md` file in the appropriate directory
2. Add it to `.vitepress/config.mts` in the sidebar configuration
3. Use frontmatter for metadata:

```md
---
title: Page Title
description: Page description
---

# Page Title

Content here...
```

### Markdown Features

VitePress supports:
- GitHub-flavored markdown
- Code syntax highlighting
- Custom containers (tip, warning, danger)
- Frontmatter
- Table of contents
- Math equations (KaTeX)

Example:

```md
::: tip
This is a helpful tip!
:::

::: warning
This is a warning!
:::

::: danger
This is dangerous!
:::

\`\`\`csharp
// Code with syntax highlighting
public class Example { }
\`\`\`
```

## Deployment

The documentation site can be deployed to:

- **GitHub Pages** - Free, easy
- **Netlify** - Free tier available
- **Vercel** - Free tier available
- **AWS S3 + CloudFront** - Your choice

### Deploy to GitHub Pages

```bash
# Build
npm run docs:build

# Deploy (manual)
# Upload docs/.vitepress/dist to gh-pages branch
```

Or use GitHub Actions (see `.github/workflows/deploy-docs.yml` example).

## Links

- [VitePress Documentation](https://vitepress.dev/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Framework Repository](https://github.com/yourusername/switchboard)
