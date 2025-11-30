# ⚡ Lambda Integration Guide

Switchboard makes it easy to integrate Lambda functions written in **any language** into your Amazon Connect contact center. Use JavaScript, Python, Go, C#, or any runtime that AWS Lambda supports.

## Overview

Lambda functions are essential for adding custom business logic to your contact flows:

- Customer authentication and lookup
- CRM integrations
- Dynamic routing decisions
- Data validation
- Call disposition recording

## Adding Lambda Functions

### The ConnectLambda Builder

Switchboard provides a `ConnectLambda` builder to easily add Lambda functions to your contact center:

```csharp
var customerLookup = ConnectLambda
    .Create("customer-lookup")
    .WithId("CustomerLookupLambda")
    .WithCode("./lambdas/customer-lookup")
    .WithHandler("index.handler")           // Depends on your language
    .WithMemory(512)
    .WithTimeout(30)
    .AssociateWithConnect(stack.InstanceId)
    .Build(stack);
```

### Full API Reference

```csharp
var lambda = ConnectLambda
    .Create("function-name")                          // Required: Function name
    .WithId("LogicalId")                              // CDK construct ID

    // Code location (choose one)
    .WithCode("./path/to/code")                       // Local directory
    .WithS3Code("bucket", "key")                      // S3 bucket
    .WithDockerImage("image-uri")                     // Container image

    // Handler (format depends on language)
    .WithHandler("index.handler")                     // Node.js
    .WithHandler("lambda_function.handler")           // Python
    .WithDotNetHandler("Assembly", "Namespace.Class", "Method") // .NET

    // Configuration
    .WithMemory(512)                                  // MB (128-10240)
    .WithTimeout(30)                                  // Seconds (1-900)
    .WithEnvironment("KEY", "value")                  // Environment variables
    .WithRuntime(Runtime.NODEJS_20_X)                 // Override runtime detection

    // DynamoDB integration
    .WithTableRead(table, "TABLE_NAME_ENV_VAR")       // Read permissions
    .WithTableWrite(table, "TABLE_NAME_ENV_VAR")     // Write permissions
    .WithTableReadWrite(table, "TABLE_NAME_ENV_VAR") // Full permissions

    // Connect integration
    .AssociateWithConnect(instanceId)                 // Required for Connect
    .ExportArn()                                      // Export ARN as CloudFormation output

    .Build(stack);
```

## Language Examples

### JavaScript / Node.js

**Project structure:**

```
lambdas/
  customer-lookup/
    index.js
    package.json
```

**index.js:**

```javascript
exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const phoneNumber = event.Details.ContactData.CustomerEndpoint.Address;

  // Your business logic here
  const customer = await lookupCustomer(phoneNumber);

  return {
    CustomerName: customer.name,
    AccountNumber: customer.accountNumber,
    IsVIP: customer.isVip ? "true" : "false",
  };
};

async function lookupCustomer(phoneNumber) {
  // Implement your lookup logic
  // Could query DynamoDB, call an API, etc.
  return {
    name: "John Doe",
    accountNumber: "12345",
    isVip: true,
  };
}
```

**Adding to Switchboard:**

```csharp
var customerLookup = ConnectLambda
    .Create("customer-lookup")
    .WithCode("./lambdas/customer-lookup")
    .WithHandler("index.handler")
    .WithRuntime(Runtime.NODEJS_20_X)
    .WithMemory(256)
    .WithTimeout(10)
    .AssociateWithConnect(stack.InstanceId)
    .Build(stack);
```

### Python

**Project structure:**

```
lambdas/
  customer-lookup/
    lambda_function.py
    requirements.txt
```

**lambda_function.py:**

```python
import json
import boto3

dynamodb = boto3.resource('dynamodb')

def handler(event, context):
    print(f"Event: {json.dumps(event)}")

    phone_number = event['Details']['ContactData']['CustomerEndpoint']['Address']

    # Your business logic here
    customer = lookup_customer(phone_number)

    return {
        'CustomerName': customer['name'],
        'AccountNumber': customer['account_number'],
        'IsVIP': 'true' if customer['is_vip'] else 'false'
    }

def lookup_customer(phone_number):
    # Implement your lookup logic
    table = dynamodb.Table('Customers')
    response = table.get_item(Key={'PhoneNumber': phone_number})
    return response.get('Item', {
        'name': 'Unknown',
        'account_number': '',
        'is_vip': False
    })
```

**Adding to Switchboard:**

```csharp
var customerLookup = ConnectLambda
    .Create("customer-lookup")
    .WithCode("./lambdas/customer-lookup")
    .WithHandler("lambda_function.handler")
    .WithRuntime(Runtime.PYTHON_3_12)
    .WithMemory(256)
    .WithTimeout(10)
    .WithTableRead(customersTable, "CUSTOMERS_TABLE")
    .AssociateWithConnect(stack.InstanceId)
    .Build(stack);
```

### TypeScript

**Project structure:**

```
lambdas/
  customer-lookup/
    src/
      index.ts
    package.json
    tsconfig.json
```

**src/index.ts:**

```typescript
import { ConnectContactFlowEvent, ConnectContactFlowResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface Customer {
  name: string;
  accountNumber: string;
  isVip: boolean;
}

export const handler = async (
  event: ConnectContactFlowEvent
): Promise<ConnectContactFlowResult> => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const phoneNumber = event.Details.ContactData.CustomerEndpoint.Address;
  const customer = await lookupCustomer(phoneNumber);

  return {
    CustomerName: customer.name,
    AccountNumber: customer.accountNumber,
    IsVIP: customer.isVip ? "true" : "false",
  };
};

async function lookupCustomer(phoneNumber: string): Promise<Customer> {
  const command = new GetCommand({
    TableName: process.env.CUSTOMERS_TABLE,
    Key: { PhoneNumber: phoneNumber },
  });

  const response = await docClient.send(command);

  return (
    (response.Item as Customer) ?? {
      name: "Unknown",
      accountNumber: "",
      isVip: false,
    }
  );
}
```

**Adding to Switchboard:**

```csharp
// After compiling TypeScript to JavaScript
var customerLookup = ConnectLambda
    .Create("customer-lookup")
    .WithCode("./lambdas/customer-lookup/dist")  // Compiled output
    .WithHandler("index.handler")
    .WithRuntime(Runtime.NODEJS_20_X)
    .WithMemory(256)
    .WithTimeout(10)
    .WithTableRead(customersTable, "CUSTOMERS_TABLE")
    .AssociateWithConnect(stack.InstanceId)
    .Build(stack);
```

### C# / .NET

**Project structure:**

```
lambdas/
  CustomerLookup/
    Function.cs
    CustomerLookup.csproj
```

**Function.cs:**

```csharp
using Amazon.Lambda.Core;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace CustomerLookup;

public class Function
{
    private readonly IDynamoDBContext _context;

    public Function()
    {
        var client = new AmazonDynamoDBClient();
        _context = new DynamoDBContext(client);
    }

    public async Task<Dictionary<string, string>> FunctionHandler(
        ConnectEvent input,
        ILambdaContext context)
    {
        var phoneNumber = input.Details.ContactData.CustomerEndpoint.Address;

        var customer = await _context.LoadAsync<Customer>(phoneNumber);

        return new Dictionary<string, string>
        {
            ["CustomerName"] = customer?.Name ?? "Unknown",
            ["AccountNumber"] = customer?.AccountNumber ?? "",
            ["IsVIP"] = customer?.IsVip == true ? "true" : "false"
        };
    }
}

public class ConnectEvent
{
    public Details Details { get; set; }
}

public class Details
{
    public ContactData ContactData { get; set; }
}

public class ContactData
{
    public Endpoint CustomerEndpoint { get; set; }
}

public class Endpoint
{
    public string Address { get; set; }
}

[DynamoDBTable("Customers")]
public class Customer
{
    [DynamoDBHashKey]
    public string PhoneNumber { get; set; }
    public string Name { get; set; }
    public string AccountNumber { get; set; }
    public bool IsVip { get; set; }
}
```

**Adding to Switchboard:**

```csharp
var customerLookup = ConnectLambda
    .Create("customer-lookup")
    .WithCode("./lambdas/CustomerLookup/bin/Release/net8.0/publish")
    .WithDotNetHandler("CustomerLookup", "CustomerLookup.Function", "FunctionHandler")
    .WithMemory(512)
    .WithTimeout(30)
    .WithTableRead(customersTable, "CUSTOMERS_TABLE")
    .AssociateWithConnect(stack.InstanceId)
    .Build(stack);
```

## Using Lambda in Flows

Once you've added a Lambda function, use it in your flows:

### Fluent API

```csharp
Flow.Create("CustomerServiceFlow")
    .PlayPrompt("Please hold while we look up your account.")
    .InvokeLambda(customerLookup, invoke => {
        invoke.Timeout = TimeSpan.FromSeconds(8);
        invoke.OnSuccess(success => success
            .SetAttribute("CustomerName", "$.External.CustomerName")
            .PlayPrompt(p => p.Dynamic("Welcome back, $.Attributes.CustomerName"))
            .TransferToQueue("VIPQueue")
        );
        invoke.OnError(error => error
            .PlayPrompt("We couldn't find your account.")
            .TransferToQueue("GeneralQueue")
        );
    })
    .Build(stack);
```

### Attribute-Based

```csharp
[ContactFlow("CustomerServiceFlow")]
public partial class CustomerServiceFlow : FlowDefinitionBase
{
    [PlayPrompt("Please hold while we look up your account.")]
    public partial void LookupMessage();

    [InvokeLambda("CustomerLookupLambda")]
    [OnSuccess(nameof(WelcomeBack))]
    [OnError(nameof(AccountNotFound))]
    public partial void LookupCustomer();

    [PlayPrompt("Welcome back, $.Attributes.CustomerName")]
    [TransferToQueue("VIPQueue")]
    public partial void WelcomeBack();

    [PlayPrompt("We couldn't find your account.")]
    [TransferToQueue("GeneralQueue")]
    public partial void AccountNotFound();
}
```

## Performance Considerations

### Cold Start Times by Language

| Runtime           | Cold Start  | Warm Execution | Best For                  |
| ----------------- | ----------- | -------------- | ------------------------- |
| **Node.js 20**    | 200-400ms   | 1-10ms         | Most use cases, I/O heavy |
| **Python 3.12**   | 300-500ms   | 1-10ms         | Data processing, ML       |
| **Go**            | 100-300ms   | 1-5ms          | High performance needs    |
| **C# .NET 8**     | 1000-2000ms | 5-20ms         | Complex business logic    |
| **C# Native AOT** | 300-500ms   | 5-20ms         | .NET with fast starts     |

### Recommendations

**For most contact center Lambda functions:**

- **Node.js** or **Python** are excellent choices
- Fast cold starts
- Large ecosystems for integrations
- Easy to write and maintain

**When to consider C#/.NET:**

- Your team primarily uses C#
- Complex business logic that benefits from strong typing
- Sharing models with your CDK code
- Use Native AOT to improve cold starts

**When to consider Go:**

- Need the fastest possible cold starts
- High-throughput scenarios
- Team has Go expertise

### Reducing Cold Starts

1. **Keep functions small** - Single responsibility
2. **Minimize dependencies** - Smaller packages = faster loads
3. **Use Provisioned Concurrency** - For critical path functions
4. **Warm functions** - Schedule periodic invocations

```csharp
// Enable Provisioned Concurrency for critical Lambda
var customerLookup = ConnectLambda
    .Create("customer-lookup")
    .WithCode("./lambdas/customer-lookup")
    .WithHandler("index.handler")
    .WithProvisionedConcurrency(2)  // Always keep 2 warm instances
    .AssociateWithConnect(stack.InstanceId)
    .Build(stack);
```

## Return Value Format

All Lambda functions invoked from Connect must return a flat dictionary of string key-value pairs:

```javascript
// ✅ Correct - Flat structure with string values
return {
  CustomerName: "John Doe",
  AccountNumber: "12345",
  IsVIP: "true", // Note: Boolean as string
};

// ❌ Incorrect - Nested objects
return {
  customer: {
    name: "John Doe",
  },
};

// ❌ Incorrect - Non-string values
return {
  CustomerName: "John Doe",
  IsVIP: true, // Should be "true" as string
};
```

## Input Event Structure

Lambda functions receive this structure from Connect:

```json
{
  "Details": {
    "ContactData": {
      "Attributes": {
        "ExistingAttribute": "value"
      },
      "Channel": "VOICE",
      "ContactId": "abc123",
      "CustomerEndpoint": {
        "Address": "+15551234567",
        "Type": "TELEPHONE_NUMBER"
      },
      "InitialContactId": "abc123",
      "InstanceARN": "arn:aws:connect:...",
      "MediaStreams": {
        "Customer": {
          "Audio": null
        }
      },
      "Queue": null,
      "SystemEndpoint": {
        "Address": "+18001234567",
        "Type": "TELEPHONE_NUMBER"
      }
    },
    "Parameters": {
      "ParameterFromFlow": "value"
    }
  },
  "Name": "ContactFlowEvent"
}
```

## Best Practices

### 1. Keep Functions Focused

One Lambda per business capability:

- `customer-lookup` - Customer data retrieval
- `account-verification` - Account validation
- `call-disposition` - Post-call recording

### 2. Handle Errors Gracefully

Always provide a fallback in your flows:

```csharp
.InvokeLambda(customerLookup, invoke => {
    invoke.OnSuccess(/* happy path */);
    invoke.OnError(/* graceful fallback */);
    invoke.OnTimeout(/* timeout handling */);
})
```

### 3. Use Environment Variables

Don't hardcode configuration:

```csharp
.WithEnvironment("API_ENDPOINT", config.ApiEndpoint)
.WithEnvironment("LOG_LEVEL", "INFO")
```

### 4. Set Appropriate Timeouts

Connect has an 8-second limit for Lambda invocations:

```csharp
.WithTimeout(8)  // Match Connect's limit
```

### 5. Log Meaningfully

```javascript
console.log("Looking up customer:", phoneNumber);
console.log("Customer found:", customer.name, "VIP:", customer.isVip);
```

## Related Documentation

- [Flow Blocks Reference](/09-FLOW-BLOCKS-REFERENCE) - All flow actions including Lambda invocation
- [Dynamic Configuration](/03-DYNAMIC-CONFIGURATION) - Store config outside your code
- [Production Examples](/08-PRODUCTION-EXAMPLES) - Complete project structures
