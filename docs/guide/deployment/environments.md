# Environment Configuration

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Switchboard supports multi-environment deployments with environment-specific configuration.

## Environment Setup

```csharp
var env = Environment.GetEnvironmentVariable("ENV") ?? "dev";

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = $"ContactCenter-{env}";
    options.Region = env == "prod" ? "us-east-1" : "us-west-2";
});
```

## appsettings per Environment

```json
// appsettings.Development.json
{
  "Switchboard": {
    "InstanceName": "ContactCenter-Dev",
    "Region": "us-west-2",
    "EnableDebug": true
  }
}

// appsettings.Production.json
{
  "Switchboard": {
    "InstanceName": "ContactCenter-Prod",
    "Region": "us-east-1",
    "EnableDebug": false
  }
}
```

## CDK Context

```json
// cdk.json
{
  "context": {
    "dev": {
      "account": "111111111111",
      "region": "us-west-2"
    },
    "prod": {
      "account": "222222222222",
      "region": "us-east-1"
    }
  }
}
```

## Deployment Commands

```bash
# Deploy to dev
ENV=dev cdk deploy

# Deploy to prod
ENV=prod cdk deploy
```

## Next Steps

- **[CI/CD](/guide/deployment/cicd)** - Automated deployments
- **[Security](/guide/deployment/security)** - Security best practices
- **[Monitoring](/guide/deployment/monitoring)** - Observability
