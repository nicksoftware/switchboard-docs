# Quick Reference & Decision Summary

## 🎯 Key Decisions at a Glance

| Question | Decision | Document Reference |
|----------|----------|-------------------|
| **Language?** | C# (.NET 8+) | [04-LANGUAGE-PERFORMANCE.md](./04-LANGUAGE-PERFORMANCE.md) |
| **CDK or Terraform?** | AWS CDK | [00-PROJECT-HUB.md](./00-PROJECT-HUB.md) |
| **Split or Unified?** | Unified with layers | [06-FRAMEWORK-ARCHITECTURE.md](./06-FRAMEWORK-ARCHITECTURE.md) |
| **Dynamic Config?** | DynamoDB + Lambda | [03-DYNAMIC-CONFIGURATION.md](./03-DYNAMIC-CONFIGURATION.md) |
| **Lambda Runtime?** | .NET 8 Native AOT | [04-LANGUAGE-PERFORMANCE.md](./04-LANGUAGE-PERFORMANCE.md) |
| **Design Patterns?** | GOF + System Patterns | [02-ARCHITECTURE-PATTERNS.md](./02-ARCHITECTURE-PATTERNS.md) |
| **Testing Framework?** | xUnit | [05-PROJECT-SETUP.md](./05-PROJECT-SETUP.md) |

## 📐 Architecture Layers

```
┌────────────────────────────────────┐
│   High-Level API (Public)         │ ← Users interact here
├────────────────────────────────────┤
│   Framework Core (Internal)       │ ← Implementation details
│   • Configuration Manager          │
│   • Infrastructure Provisioner     │
│   • Flow Builder                   │
├────────────────────────────────────┤
│   AWS Layer (L1 + SDK)            │ ← Direct AWS interaction
└────────────────────────────────────┘
```

## 🏗️ Design Patterns Used

| Pattern | Purpose | Where Used |
|---------|---------|------------|
| **Builder** | Fluent flow construction | FlowBuilder, QueueBuilder |
| **Factory** | Create actions/components | ActionFactory, FlowFactory |
| **Strategy** | Routing algorithms | RoutingStrategy |
| **Decorator** | Add cross-cutting concerns | Logging, Validation, Caching |
| **Composite** | Flow hierarchy | FlowModule, ContactFlow |
| **Singleton** | Configuration manager | ConfigManager |
| **Observer** | Config change notifications | ConfigChangeNotifier |
| **Repository** | Data access abstraction | ConfigRepository |
| **Unit of Work** | Transaction coordination | ConfigUnitOfWork |
| **CQRS** | Separate read/write | Commands vs Queries |

## 💾 DynamoDB Tables

| Table Name | Partition Key | Sort Key | Purpose |
|------------|---------------|----------|---------|
| `ConnectFlowConfigurations` | flowId | version | Flow runtime config |
| `ConnectQueueConfigurations` | queueId | - | Queue settings |
| `ConnectRoutingConfigurations` | routingKey | conditionId | Routing rules |
| `ConnectLoggingConfigurations` | resourceType | resourceId | Logging config |
| `ConnectFeatureFlags` | featureName | environment | Feature toggles |

## ⚡ Performance Benchmarks

| Configuration | Cold Start | Warm Execution | Cost (1M invocations) |
|---------------|------------|----------------|----------------------|
| Node.js 20 | 287ms | 12ms | $3.20 |
| Python 3.12 | 412ms | 18ms | $3.20 |
| C# Traditional | 1543ms | 24ms | $4.50 |
| **C# Native AOT** | **398ms** | **21ms** | **$3.20** |
| C# + Provisioned | 0ms | 24ms | $24.80 |

**Recommendation**: Use C# Native AOT for best balance of performance and cost.

## 🔄 Configuration Update Flow

```
Admin Updates Config in DynamoDB
        ↓
Cache Invalidation (Redis)
        ↓
Next Call to Connect
        ↓
Lambda Fetches Fresh Config
        ↓
Flow Executes with New Config
        ↓
✅ Zero Downtime
```

## 📦 Project Structure

```
amazon-connect-cdk-framework/
├── src/
│   ├── MyCompany.Connect.Framework/       # Main framework
│   │   ├── Core/                           # Orchestration
│   │   ├── Configuration/                  # DynamoDB config
│   │   ├── Infrastructure/                 # CDK constructs
│   │   ├── Flows/                          # Flow builder
│   │   └── Models/                         # Shared models
│   ├── MyCompany.Connect.Lambda.ConfigFetcher/
│   └── MyCompany.Connect.Deployment/       # CDK app
├── test/
│   ├── MyCompany.Connect.Framework.Tests/
│   └── MyCompany.Connect.Lambda.Tests/
└── examples/
```

## 🚀 Quick Start Commands

```bash
# Setup
dotnet new sln
dotnet new classlib -n Framework
dotnet new lambda.EmptyFunction -n ConfigFetcher
dotnet add package Amazon.CDK.Lib

# Build
dotnet build

# Test
dotnet test

# Deploy
cd src/Deployment
cdk synth
cdk deploy

# Lambda Native AOT
dotnet publish -c Release -r linux-x64 /p:PublishAot=true
```

## 🧪 Testing Strategy

| Test Type | Purpose | Framework |
|-----------|---------|-----------|
| **Unit** | Individual components | xUnit |
| **Integration** | CDK + DynamoDB | xUnit + Amazon.CDK.Assertions |
| **Snapshot** | CloudFormation templates | CDK Assertions |
| **E2E** | Complete workflows | LocalStack |

### Sample Unit Test
```csharp
[Fact]
public void TestQueueCreation()
{
    var app = new App();
    var stack = new Stack(app, "test");
    var template = Template.FromStack(stack);
    
    template.ResourceCountIs("AWS::Connect::Queue", 1);
    template.HasResourceProperties("AWS::Connect::Queue", 
        new Dictionary<string, object>
        {
            { "MaxContacts", 50 }
        });
}
```

## 🔐 Security Checklist

- [x] DynamoDB encryption at rest with KMS
- [x] All API calls over HTTPS
- [x] Lambda in VPC private subnets
- [x] IAM least privilege roles
- [x] Secrets in AWS Secrets Manager
- [x] CloudTrail logging enabled
- [x] Input validation on all configs
- [x] No secrets in code or Git

## 💰 Cost Estimates

**Monthly Infrastructure** (medium call center):
- DynamoDB: $10-20
- Lambda: $5-15
- S3: $1-5
- ElastiCache (optional): $30-50
- **Total**: ~$50-90/month

*Excludes Amazon Connect per-minute usage charges*

## 📋 Implementation Phases

| Phase | Duration | Focus |
|-------|----------|-------|
| **1. Foundation** | Weeks 1-2 | Models, setup, structure |
| **2. Flow Builder** | Weeks 3-4 | Fluent interface, actions |
| **3. CDK Constructs** | Weeks 5-6 | L2 wrappers, dependencies |
| **4. Config Layer** | Weeks 7-8 | DynamoDB, Lambda, cache |
| **5. Testing** | Weeks 9-10 | Comprehensive tests |
| **6. Hardening** | Weeks 11-12 | Security, docs, examples |

## 🎨 Code Style Conventions

```csharp
// Namespaces
namespace MyCompany.Connect.Framework.Core;

// Public classes - PascalCase
public class ContactFlowBuilder { }

// Methods - PascalCase
public void AddAction() { }

// Properties - PascalCase
public string FlowName { get; set; }

// Private fields - _camelCase
private readonly string _flowId;

// Constants - PascalCase
public const int MaxActions = 250;

// Fluent interface - return this
public ContactFlowBuilder SetName(string name)
{
    _name = name;
    return this;
}
```

## 🔗 Essential Links

- **AWS CDK**: https://docs.aws.amazon.com/cdk/
- **Amazon Connect API**: https://docs.aws.amazon.com/connect/latest/APIReference/
- **Flow Language**: https://docs.aws.amazon.com/connect/latest/APIReference/flow-language.html
- **.NET Lambda**: https://docs.aws.amazon.com/lambda/latest/dg/csharp-handler.html
- **Native AOT**: https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/

## 🆘 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| CDK bootstrap fails | Check AWS credentials: `aws sts get-caller-identity` |
| Lambda cold starts too slow | Use Native AOT or provisioned concurrency |
| DynamoDB throttling | Increase provisioned capacity or use on-demand |
| Flow validation errors | Check action count (<250) and JSON structure |
| CDK synth timeout | Break into smaller stacks |
| Test failures | Run `dotnet restore --force` |

## 🎓 Learning Resources

### Start Here
1. Read [00-PROJECT-HUB.md](./00-PROJECT-HUB.md) - Overview
2. Follow [05-PROJECT-SETUP.md](./05-PROJECT-SETUP.md) - Setup
3. Study [02-ARCHITECTURE-PATTERNS.md](./02-ARCHITECTURE-PATTERNS.md) - Patterns

### Deep Dives
- **Dynamic Config**: [03-DYNAMIC-CONFIGURATION.md](./03-DYNAMIC-CONFIGURATION.md)
- **Performance**: [04-LANGUAGE-PERFORMANCE.md](./04-LANGUAGE-PERFORMANCE.md)
- **Architecture**: [06-FRAMEWORK-ARCHITECTURE.md](./06-FRAMEWORK-ARCHITECTURE.md)

## 📞 Getting Help

1. Check this quick reference
2. Search specific document
3. Review code examples
4. Check troubleshooting guide
5. Ask team/community

## ✅ Pre-Deployment Checklist

- [ ] All tests passing
- [ ] CDK synth succeeds
- [ ] Security review completed
- [ ] Cost estimates reviewed
- [ ] Documentation updated
- [ ] Examples working
- [ ] CI/CD pipeline tested
- [ ] Monitoring configured
- [ ] Rollback plan documented

## 🔄 Update Workflow

```bash
# Make code changes
# ↓
# Run tests
dotnet test
# ↓
# Check CDK diff
cdk diff
# ↓
# Deploy to dev
cdk deploy --profile dev
# ↓
# Verify in dev environment
# ↓
# Deploy to prod
cdk deploy --profile prod
# ↓
# Monitor metrics
```

## 🎯 Success Metrics

| Metric | Target | Tracking |
|--------|--------|----------|
| Test Coverage | >80% | `dotnet test --collect:"XPlat Code Coverage"` |
| Cold Start | <500ms | CloudWatch Logs |
| Config Fetch | <50ms | CloudWatch Metrics |
| Deployment Time | <5min | CI/CD pipeline |
| Documentation | 100% public APIs | XML comments |

## 💡 Pro Tips

1. **Start Simple**: Use high-level API first
2. **Test Early**: Write tests as you build
3. **Cache Aggressively**: Reduce DynamoDB reads
4. **Monitor Always**: CloudWatch dashboards
5. **Version Everything**: Git + semantic versioning
6. **Document Decisions**: ADRs in Notion
7. **Review Regularly**: Weekly progress checks
8. **Refactor Ruthlessly**: Keep code clean
9. **Optimize Later**: Make it work, then fast
10. **Share Knowledge**: Team demos and docs

---

**Print this page for quick reference during development!**
