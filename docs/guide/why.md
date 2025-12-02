# Why Use Switchboard?

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). We're working toward a stable 1.0 release with your feedback.
:::

## The Problem with Traditional Amazon Connect Development

### 1. Console-First Development is Error-Prone

Building contact flows in the AWS Console:

- ❌ Manual testing required
- ❌ Difficult to replicate across environments if you don't have a pipeline
- ❌ Hard to collaborate with teams
- ❌ Prone to human error

### 2. JSON/CloudFormation is Verbose and Fragile

Writing flows in JSON or CloudFormation:

- ❌ Hundreds of lines of boilerplate
- ❌ No IntelliSense or type safety
- ❌ Easy to break with typos
- ❌ Hard to maintain and refactor
- ❌ No built-in testing support

**Example**: A simple "Welcome and transfer to queue" flow requires **50+ lines of JSON**.

### 3. No Code Reusability

- Each flow is built from scratch
- Common patterns (authentication, business hours) duplicated everywhere
- No shared modules or components
- Changes require manual updates across multiple flows

### 4. Limited Runtime Flexibility

- Infrastructure changes require full redeployment
- Can't update prompts or routing without CDK deploy
- No A/B testing capabilities
- Business users can't make simple changes

## How Switchboard Solves These Problems

### ✅ Code-First with C#

Write contact center infrastructure in **type-safe C#**:

```csharp
[ContactFlow("CustomerService")]
public partial class ServiceFlow : FlowDefinitionBase
{
    [Message("Welcome to customer service")]
    public partial void Welcome();

    [TransferToQueue("Support")]
    public partial void Transfer();
}
```

**Benefits**:

- IntelliSense and autocomplete
- Compile-time error checking
- Refactoring support
- Easy to read and understand

### ✅ Version Control Everything

Your entire contact center is **code in Git**:

- Track every change with commits
- Review changes with pull requests
- Rollback problematic deployments
- Collaborate with teams using standard dev workflows

### ✅ Reusable Components

Build once, use everywhere:

```csharp
[FlowModule("Authentication")]
public partial class AuthModule : FlowModuleBase
{
    // Define once, use in multiple flows
}
```

### ✅ Dynamic Runtime Configuration

Update settings without redeployment:

```csharp
// Change queue timeout in DynamoDB
await config.UpdateAsync("SupportFlow", new {
    maxQueueTime = 600  // No CDK deploy needed
});
```

**Next call uses the new value automatically.**

### ✅ Testing Built-In

Write unit and integration tests:

```csharp
[Test]
public void SalesFlow_Should_Route_Premium_Customers()
{
    var flow = new SalesFlow();
    var result = flow.Route(new Customer { Type = "Premium" });

    result.Queue.Should().Be("PremiumSales");
}
```

### ✅ Multi-Environment Support

Same code, different configs:

```csharp
// appsettings.Development.json
{ "InstanceName": "dev-call-center" }

// appsettings.Production.json
{ "InstanceName": "prod-call-center" }
```

Deploy to dev, staging, and production with confidence.

## Comparison with Alternatives

| Feature                     | Console   | CloudFormation | Terraform    | **Switchboard** |
| --------------------------- | --------- | -------------- | ------------ | --------------- |
| **Version Control**         | ❌ Manual | ✅ Yes         | ✅ Yes       | ✅ Yes          |
| **Type Safety**             | ❌ None   | ⚠️ Limited     | ⚠️ Limited   | ✅ Full         |
| **IntelliSense**            | ❌ No     | ❌ No          | ⚠️ Partial   | ✅ Yes          |
| **Testing**                 | ❌ Manual | ⚠️ Difficult   | ⚠️ Difficult | ✅ Easy         |
| **Runtime Updates**         | ✅ Yes    | ❌ No          | ❌ No        | ✅ Yes          |
| **Code Reuse**              | ❌ No     | ⚠️ Limited     | ⚠️ Limited   | ✅ Yes          |
| **Compile-Time Validation** | ❌ No     | ❌ No          | ❌ No        | ✅ Yes          |
| **Learning Curve**          | ⭐ Easy   | ⭐⭐ Medium    | ⭐⭐⭐ Hard  | ⭐⭐ Medium     |

## Who Should Use Switchboard?

### Perfect For

- ✅ **DevOps teams** managing contact centers as infrastructure
- ✅ **Developers** building telephony applications
- ✅ **Enterprises** requiring version control and CI/CD
- ✅ **Teams migrating** from console-managed to IaC
- ✅ **Projects needing** runtime configuration flexibility
- ✅ **Organizations with** multiple environments (dev/staging/prod)

## Real-World Benefits

### Before Switchboard

**Problem**: A financial services company managed 50+ contact flows manually in the Console.

- Changes took **2-3 days** (dev → staging → prod)
- **Frequent production bugs** from manual errors
- **No audit trail** of who changed what
- **Testing was manual** and time-consuming
- **Rollbacks required** manual console work

### After Switchboard

- Changes deployed in **minutes** via CI/CD
- **Zero production bugs** from typos (compile-time checks)
- **Full Git history** of all changes
- **Automated testing** catches issues before deployment
- **Instant rollbacks** with `git revert` + deploy

**Result**: 90% reduction in deployment time, zero manual errors.

## Technical Advantages

### 1. Source Generators

Framework generates boilerplate code at compile-time:

- ✅ Write less code
- ✅ Consistent implementations
- ✅ Zero runtime overhead

### 2. Roslyn Analyzers

Catch errors before deployment:

- ✅ Validates queue references exist
- ✅ Checks flow structure
- ✅ Ensures proper action ordering
- ✅ Provides code fixes

### 3. Dependency Injection

ASP.NET Core-style DI:

- ✅ Testable components
- ✅ Swappable implementations
- ✅ Clean architecture

### 4. CDK Integration

Built on AWS CDK:

- ✅ CloudFormation under the hood
- ✅ All AWS services supported
- ✅ Infrastructure as real code
- ✅ Strong typing

## Cost Considerations

You pay for AWS resources consumed:

- Amazon Connect usage (per minute)
- Lambda invocations (if using dynamic config)
- DynamoDB storage (if using dynamic config)

**Estimated monthly AWS cost** for small contact center:

- Connect: $50-100/month
- Lambda + DynamoDB: $5-10/month (if enabled)

Switchboard framework pricing and licensing terms will be announced before the 1.0 release.

## Migration Path

Already have a contact center? No problem.

Switchboard supports **incremental migration**:

1. **Import existing instance** (don't rebuild from scratch)
2. **Manage new flows** with code
3. **Leave old flows** in console (temporarily)
4. **Gradually migrate** old flows when ready

See [Existing Instance Migration](/examples/existing-instance) for details.

## Community and Support

- 📖 **Documentation**: Comprehensive guides and examples
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/nicksoftware/AmazonConnectBuilderFramework/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/nicksoftware/AmazonConnectBuilderFramework/discussions)
- 📧 **Direct Support**: nicolusmaluleke@gmail.com

## Get Started

Ready to modernize your contact center development?

1. **[Installation Guide](/guide/installation)** - Set up in 5 minutes
2. **[Quick Start](/guide/quick-start)** - Build your first flow
3. **[Examples](/examples/minimal-setup)** - Learn from working code

## Still Not Convinced?

Try the **[Single-File Setup](/examples/single-file-setup)** example. You'll have a working contact center deployed in under 10 minutes, and you can decide if the code-first approach fits your workflow.

If Switchboard isn't right for you, that's okay! The AWS Console and CloudFormation are proven tools. Use what works best for your team.
