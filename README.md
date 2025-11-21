# Switchboard Documentation

> **Official documentation for Switchboard** - A code-first framework for building Amazon Connect contact centers using AWS CDK and C#.

📖 **[View Documentation](https://nicksoftware.github.io/switchboard-docs/)**

---

## About This Repository

This repository contains the **official documentation** for the Switchboard framework. The documentation is built with [VitePress](https://vitepress.dev/) and automatically deployed to GitHub Pages.

- 🔨 **Framework source code**: [nicksoftware/switchboard](https://github.com/nicksoftware/switchboard) (private)
- 📚 **Documentation source**: This repository (public)
- 🌐 **Documentation website**: https://nicksoftware.github.io/switchboard-docs/

## 🚀 Quick Start

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Local Development

```bash
# Clone the repository
git clone https://github.com/nicksoftware/switchboard-docs.git
cd switchboard-docs

# Install dependencies
npm install

# Start development server
npm run docs:dev

# Build for production
npm run docs:build

# Preview production build
npm run docs:preview
```

The documentation will be available at `http://localhost:5173`.

## 📝 Contributing

We welcome contributions from the community! Here's how you can help:

### Documentation Improvements

1. **Fork this repository**
2. **Create a feature branch**: `git checkout -b docs/improve-getting-started`
3. **Make your changes** in the `docs/` directory
4. **Test locally**: `npm run docs:dev`
5. **Commit your changes**: `git commit -m "docs: Improve getting started guide"`
6. **Push to your fork**: `git push origin docs/improve-getting-started`
7. **Open a Pull Request**

### Reporting Issues

Found a typo, broken link, or unclear explanation? Please [open an issue](../../issues/new)!

### Discussions

Have questions or want to share how you're using Switchboard? Start a [Discussion](../../discussions)!

## 📂 Repository Structure

```
switchboard-docs/
├── docs/                      # Documentation source files
│   ├── .vitepress/           # VitePress configuration
│   │   ├── config.ts         # Site configuration
│   │   └── theme/            # Custom theme components
│   ├── guide/                # User guides
│   ├── examples/             # Code examples
│   ├── api/                  # API reference
│   └── index.md              # Homepage
├── .github/
│   └── workflows/
│       └── deploy.yml        # Deployment workflow
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🔄 Deployment

Documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` or `staging` branches:

- **Main branch** → Production documentation
- **Staging branch** → Preview documentation

The deployment process:
1. Push changes to `main` or `staging`
2. GitHub Actions builds the site
3. Built site is deployed to `gh-pages` branch
4. GitHub Pages serves the site

## 📋 Documentation Guidelines

### Writing Style

- Use clear, concise language
- Include code examples for concepts
- Add links to related sections
- Use proper markdown formatting

### Code Examples

- Always test code examples before committing
- Include comments explaining complex code
- Show both simple and advanced usage
- Use TypeScript/C# syntax highlighting

### File Organization

- Keep related content together
- Use descriptive file names
- Maintain consistent heading structure
- Update navigation in `.vitepress/config.ts`

## 🔗 Links

- **Framework Repository**: [nicksoftware/switchboard](https://github.com/nicksoftware/switchboard)
- **Documentation Website**: https://nicksoftware.github.io/switchboard-docs/
- **Issue Tracker**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)

## 📄 License

The documentation is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with [VitePress](https://vitepress.dev/)** | **Powered by [GitHub Pages](https://pages.github.com/)**

Made with ❤️ by the Switchboard team

</div>
