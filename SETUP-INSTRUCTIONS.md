# Setup Instructions for Switchboard Documentation Repository

This guide will help you set up the standalone public documentation repository.

## 📋 Prerequisites

- GitHub account
- Git installed locally
- Node.js 20+ installed

## 🚀 Step-by-Step Setup

### Step 1: Create the Public Repository on GitHub

1. Go to https://github.com/new
2. Configure the repository:
   - **Owner**: nicksoftware
   - **Repository name**: `switchboard-docs`
   - **Description**: `Official documentation for Switchboard - Amazon Connect CDK Framework`
   - **Visibility**: ✅ **Public** (required for free GitHub Pages)
   - **Initialize this repository**:
     - ✅ Add a README file
     - Add .gitignore: **Node**
     - Choose a license: **MIT License**
3. Click "Create repository"

### Step 2: Enable GitHub Pages

1. In your new `switchboard-docs` repository, go to:
   - **Settings** → **Pages**
2. Configure:
   - **Source**: GitHub Actions
3. Save

### Step 3: Enable Community Features

1. Go to **Settings** → **General** → **Features**
2. Enable:
   - ✅ **Issues** (for bug reports and feature requests)
   - ✅ **Discussions** (for Q&A and community engagement)

3. Set up Discussion categories:
   - Go to **Discussions** tab
   - Click "Set up Discussions"
   - Keep default categories or customize:
     - 📢 Announcements
     - 💡 Ideas (feature requests)
     - 🙏 Q&A (questions)
     - 🙌 Show and tell (user showcases)

### Step 4: Clone the Repository Locally

```bash
cd ~/Projects
git clone https://github.com/nicksoftware/switchboard-docs.git
cd switchboard-docs
```

### Step 5: Copy Files from Template

Copy all files from the `.docs-repo-template` directory in your main repository:

```bash
# From your main repo directory
cd /Users/nick/Projects/AmazonConnectBuilderFramework

# Copy template files to docs repo
cp .docs-repo-template/README.md ~/Projects/switchboard-docs/
cp .docs-repo-template/package.json ~/Projects/switchboard-docs/
cp .docs-repo-template/.gitignore ~/Projects/switchboard-docs/
mkdir -p ~/Projects/switchboard-docs/.github/workflows
cp .docs-repo-template/.github-workflows-deploy.yml ~/Projects/switchboard-docs/.github/workflows/deploy.yml

# Copy all documentation files
cp -r docs ~/Projects/switchboard-docs/
```

### Step 6: Install Dependencies

```bash
cd ~/Projects/switchboard-docs
npm install
```

### Step 7: Test Locally

```bash
npm run docs:dev
```

Open http://localhost:5173 in your browser. The documentation should load correctly.

### Step 8: Commit and Push

```bash
cd ~/Projects/switchboard-docs

git add .
git commit -m "Initial documentation setup

- Add VitePress documentation site
- Configure GitHub Actions deployment
- Set up project structure and dependencies
"

git push origin main
```

### Step 9: Verify Deployment

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. You should see "Deploy Documentation" workflow running
4. Wait for it to complete (usually 2-3 minutes)
5. Once complete, visit: **https://nicksoftware.github.io/switchboard-docs/**

## ✅ Success Checklist

After setup, verify:

- [ ] Documentation site loads at https://nicksoftware.github.io/switchboard-docs/
- [ ] Local development works (`npm run docs:dev`)
- [ ] GitHub Actions workflow passes
- [ ] Issues are enabled
- [ ] Discussions are enabled
- [ ] Repository is public

## 🔄 Workflow

### Daily Documentation Updates

```bash
# Make changes to documentation
cd ~/Projects/switchboard-docs
# Edit files in docs/

# Test locally
npm run docs:dev

# Commit and push
git add .
git commit -m "docs: Update getting started guide"
git push origin main
```

The site will automatically rebuild and deploy in 2-3 minutes.

### Accepting Community Contributions

When someone submits a PR:

1. Review the changes in the PR
2. Test locally if needed:
   ```bash
   git fetch origin pull/ID/head:pr-ID
   git checkout pr-ID
   npm run docs:dev
   ```
3. Approve and merge if good
4. Site will auto-deploy

## 🔧 Troubleshooting

### Build Fails

Check the Actions tab for error details. Common issues:
- Missing dependencies: Run `npm install`
- VitePress config errors: Check `.vitepress/config.ts`
- Broken links: Fix in documentation files

### GitHub Pages Not Showing

1. Check Settings → Pages is set to "GitHub Actions"
2. Verify workflow ran successfully in Actions tab
3. Wait 2-3 minutes after deployment
4. Try hard refresh (Ctrl+F5 / Cmd+Shift+R)

### Local Development Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run docs:dev
```

## 📚 Next Steps

- Update documentation content in `docs/` directory
- Customize VitePress config in `docs/.vitepress/config.ts`
- Add custom components in `docs/.vitepress/theme/`
- Invite contributors to submit PRs
- Announce the documentation site to users

## 🔗 Useful Links

- VitePress Documentation: https://vitepress.dev/
- GitHub Pages Documentation: https://docs.github.com/pages
- GitHub Actions Documentation: https://docs.github.com/actions

---

Need help? Open an issue in the main framework repository!
