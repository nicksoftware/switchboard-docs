# CI/CD Pipelines

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Automate Switchboard deployments with CI/CD pipelines.

## GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Contact Center

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'

      - name: Install dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore

      - name: Test
        run: dotnet test --no-build

      - name: CDK Deploy
        run: |
          npm install -g aws-cdk
          cdk deploy --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
```

## Azure Pipelines

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: UseDotNet@2
  inputs:
    version: '10.0.x'

- script: dotnet build
  displayName: 'Build'

- script: dotnet test
  displayName: 'Test'

- script: |
    npm install -g aws-cdk
    cdk deploy --require-approval never
  displayName: 'Deploy'
  env:
    AWS_ACCESS_KEY_ID: $(AWS_ACCESS_KEY_ID)
    AWS_SECRET_ACCESS_KEY: $(AWS_SECRET_ACCESS_KEY)
```

## Next Steps

- **[Environments](/guide/deployment/environments)** - Multi-environment config
- **[Security](/guide/deployment/security)** - Deployment security
- **[Monitoring](/guide/deployment/monitoring)** - Post-deployment monitoring
