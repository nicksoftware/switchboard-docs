# Monitoring & Observability

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Monitor your contact center with CloudWatch and custom metrics.

## CloudWatch Logs

Flows automatically log to CloudWatch:

```
/aws/connect/ContactCenter-Prod/flows/SalesInbound
```

## Custom Metrics

```csharp
public class MetricsMiddleware : IFlowMiddleware
{
    private readonly IMetricsPublisher _metrics;

    public async Task InvokeAsync(FlowContext context, Func<Task> next)
    {
        var sw = Stopwatch.StartNew();
        await next();
        sw.Stop();

        _metrics.Publish(new Metric
        {
            Name = "FlowExecutionTime",
            Value = sw.ElapsedMilliseconds,
            Unit = Unit.Milliseconds,
            Dimensions = new[] { new Dimension("FlowName", context.FlowName) }
        });
    }
}
```

## Alarms

```csharp
var alarm = new Alarm(this, "FlowErrorAlarm", new AlarmProps
{
    Metric = flow.MetricErrors(),
    Threshold = 10,
    EvaluationPeriods = 1,
    AlarmDescription = "Flow errors exceeded threshold"
});
```

## Next Steps

- **[Security](/guide/deployment/security)** - Secure monitoring
- **[CI/CD](/guide/deployment/cicd)** - Deploy with monitoring
