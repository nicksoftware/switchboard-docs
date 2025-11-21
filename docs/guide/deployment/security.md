# Security Best Practices

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Security considerations for Switchboard deployments.

## IAM Roles

Use least-privilege IAM roles:

```csharp
var lambdaRole = new Role(this, "ConfigFetcherRole", new RoleProps
{
    AssumedBy = new ServicePrincipal("lambda.amazonaws.com"),
    ManagedPolicies = new[]
    {
        ManagedPolicy.FromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    }
});

// Grant only read access to DynamoDB
configTable.GrantReadData(lambdaRole);
```

## Encryption

Enable encryption at rest:

```csharp
var configTable = new Table(this, "ConfigTable", new TableProps
{
    Encryption = TableEncryption.AWS_MANAGED,  // Or CUSTOMER_MANAGED
    PointInTimeRecovery = true
});
```

## Secrets Management

Use AWS Secrets Manager:

```csharp
[InvokeLambda("ApiFunction")]
[SecretArn("arn:aws:secretsmanager:us-east-1:123456789:secret:api-key")]
public partial void CallApi();
```

## Next Steps

- **[Monitoring](/guide/deployment/monitoring)** - Security monitoring
- **[Environments](/guide/deployment/environments)** - Secure multi-env
