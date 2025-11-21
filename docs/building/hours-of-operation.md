# Building Hours of Operation

## What are Hours of Operation?

**Hours of Operation** define when your contact center is open for business. They're business hours schedules that tell Amazon Connect when you're available to take calls, and when you're closed.

Think of it like the "Open/Closed" sign on a store - it tells customers when you're available and when to come back later.

### Real-World Examples

- **Standard Business Hours**: Monday-Friday, 9 AM - 5 PM Eastern Time
- **24/7 Support**: Open every day, all day (emergency hotlines, global support)
- **Extended Hours**: Monday-Friday 8 AM - 8 PM, Saturday 10 AM - 4 PM
- **Holiday Hours**: Special schedules for holidays and events

### How Hours of Operation Work

1. **Define schedule** → Set open/close times for each day of week
2. **Set timezone** → Ensure times are correct for your location
3. **Assign to queues** → Queues use hours to determine if they're open
4. **Check in flows** → Flows can route differently based on open/closed status

### When You Need Hours of Operation

Create hours of operation whenever you want to:

- Route calls differently during vs. after business hours
- Play different messages when closed
- Set queue availability schedules
- Handle time zone differences
- Create holiday or special event schedules

---

## Creating Your First Hours of Operation

Let's build a simple Monday-Friday 9-5 schedule step-by-step.

### Step 1: Create Hours Object

Start by creating an `HoursOfOperation` object:

```csharp
var hours = new HoursOfOperation
{
    Name = "BusinessHours",
    TimeZone = "America/New_York"
};
```

**Important:** Always set the correct timezone for your business location!

### Step 2: Add Day Configurations

Add hours for each day you're open:

```csharp
// Monday through Friday: 9 AM - 5 PM
for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    hours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 17, Minutes = 0 }  // 5 PM in 24-hour format
    });
}
```

### Step 3: Add to Stack

Add the hours to your CDK stack:

```csharp
var app = new App();
var stack = new SwitchboardStack(app, "MyContactCenter", "my-center");

var hours = new HoursOfOperation
{
    Name = "BusinessHours",
    TimeZone = "America/New_York"
};

for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    hours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 17, Minutes = 0 }
    });
}

stack.AddHoursOfOperation(hours);
app.Synth();
```

### Step 4: Deploy

Deploy your stack:

```bash
cdk deploy
```

**Congratulations!** You've created your first hours of operation schedule. Now you can use it with queues and flows.

---

## Hours of Operation Configuration

Let's explore the different settings and patterns.

### Setting Name (Required)

Every hours schedule must have a unique name:

```csharp
var hours = new HoursOfOperation
{
    Name = "MainOfficeHours",
    TimeZone = "America/New_York"
};
```

**Naming Tips:**
- Be descriptive (BusinessHours, WeekendHours, HolidayHours)
- Indicate the purpose or location
- Keep it short but meaningful

### Setting TimeZone (Required)

Always specify the correct timezone:

```csharp
var hours = new HoursOfOperation
{
    Name = "WestCoastHours",
    TimeZone = "America/Los_Angeles"  // Pacific Time
};
```

**Common Timezones:**
- `"America/New_York"` - Eastern Time
- `"America/Chicago"` - Central Time
- `"America/Denver"` - Mountain Time
- `"America/Los_Angeles"` - Pacific Time
- `"UTC"` - Coordinated Universal Time
- `"Europe/London"` - British Time
- `"Asia/Tokyo"` - Japan Time

**Important:** Use IANA timezone identifiers (not "EST" or "PST").

### Adding Description (Optional)

Document the schedule's purpose:

```csharp
var hours = new HoursOfOperation
{
    Name = "ExtendedSupportHours",
    Description = "Extended customer support hours during holiday season",
    TimeZone = "America/New_York"
};
```

---

## Defining Day Schedules

### Understanding TimeRange

Time is specified in 24-hour format using `TimeRange`:

```csharp
new TimeRange { Hours = 9, Minutes = 0 }   // 9:00 AM
new TimeRange { Hours = 17, Minutes = 0 }  // 5:00 PM
new TimeRange { Hours = 13, Minutes = 30 } // 1:30 PM
new TimeRange { Hours = 23, Minutes = 59 } // 11:59 PM
```

**24-Hour Time Reference:**
- 00:00 = Midnight
- 09:00 = 9 AM
- 12:00 = Noon
- 17:00 = 5 PM
- 23:59 = 11:59 PM

### Adding a Single Day

Configure hours for a specific day:

```csharp
hours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Monday,
    StartTime = new TimeRange { Hours = 9, Minutes = 0 },
    EndTime = new TimeRange { Hours = 17, Minutes = 0 }
});
```

### Adding Multiple Days (Loop)

Use a loop for consistent hours across multiple days:

```csharp
// Monday through Friday: 9 AM - 5 PM
for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    hours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 17, Minutes = 0 }
    });
}
```

### Adding All Days (24/7)

Create a schedule open every day:

```csharp
// Sunday through Saturday: 24/7
for (var day = DayOfWeek.Sunday; day <= DayOfWeek.Saturday; day++)
{
    hours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 0, Minutes = 0 },
        EndTime = new TimeRange { Hours = 23, Minutes = 59 }
    });
}
```

### Adding Different Hours for Different Days

Configure each day separately:

```csharp
// Monday-Friday: 9 AM - 6 PM
for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    hours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 18, Minutes = 0 }
    });
}

// Saturday: 10 AM - 2 PM
hours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Saturday,
    StartTime = new TimeRange { Hours = 10, Minutes = 0 },
    EndTime = new TimeRange { Hours = 14, Minutes = 0 }
});

// Sunday: Closed (don't add config = closed)
```

**Important:** If you don't add a config for a day, that day is considered **closed**.

---

## Using Hours with Queues

Associate hours with queues when adding them to the stack:

```csharp
// Create hours
var businessHours = new HoursOfOperation
{
    Name = "BusinessHours",
    TimeZone = "America/New_York"
};

for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    businessHours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 17, Minutes = 0 }
    });
}

stack.AddHoursOfOperation(businessHours);

// Create queue and associate with hours
var queue = new QueueBuilder()
    .SetName("CustomerSupport")
    .Build();

stack.AddQueue(queue, "BusinessHours"); // Links queue to hours
```

**What this does:**
- Queue "CustomerSupport" follows "BusinessHours" schedule
- Agents assigned to this queue are only available during business hours
- You can check hours status in contact flows

---

## Using Hours in Contact Flows

Check if you're open or closed in contact flows:

```csharp
var flow = new FlowBuilder()
    .SetName("MainFlow")
    .PlayPrompt("Thank you for calling!")
    .CheckHoursOfOperation("BusinessHours")  // Check if we're open
    // Flow continues based on open/closed status
    .Build();
```

**Future enhancement:** Flow builder will support `.OnOpen()` and `.OnClosed()` methods for conditional routing.

---

## Complete Examples

### Example 1: Standard Business Hours (M-F 9-5)

```csharp
var businessHours = new HoursOfOperation
{
    Name = "StandardBusinessHours",
    Description = "Monday through Friday, 9 AM to 5 PM Eastern Time",
    TimeZone = "America/New_York"
};

for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    businessHours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 17, Minutes = 0 }
    });
}

stack.AddHoursOfOperation(businessHours);
```

### Example 2: 24/7 Support

```csharp
var support24x7 = new HoursOfOperation
{
    Name = "24x7Support",
    Description = "24/7 customer support - always available",
    TimeZone = "UTC"  // Use UTC for global 24/7 operations
};

for (var day = DayOfWeek.Sunday; day <= DayOfWeek.Saturday; day++)
{
    support24x7.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 0, Minutes = 0 },
        EndTime = new TimeRange { Hours = 23, Minutes = 59 }
    });
}

stack.AddHoursOfOperation(support24x7);
```

### Example 3: Extended Hours with Weekend

```csharp
var extendedHours = new HoursOfOperation
{
    Name = "ExtendedHours",
    Description = "Extended hours with limited weekend availability",
    TimeZone = "America/Chicago"
};

// Monday-Friday: 8 AM - 8 PM
for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    extendedHours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 8, Minutes = 0 },
        EndTime = new TimeRange { Hours = 20, Minutes = 0 }
    });
}

// Saturday: 10 AM - 4 PM
extendedHours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Saturday,
    StartTime = new TimeRange { Hours = 10, Minutes = 0 },
    EndTime = new TimeRange { Hours = 16, Minutes = 0 }
});

// Sunday: Closed (no config = closed)

stack.AddHoursOfOperation(extendedHours);
```

### Example 4: Different Hours for Different Days

```csharp
var retailHours = new HoursOfOperation
{
    Name = "RetailHours",
    Description = "Retail store hours - different each day",
    TimeZone = "America/Los_Angeles"
};

// Monday-Thursday: 9 AM - 6 PM
for (var day = DayOfWeek.Monday; day <= DayOfWeek.Thursday; day++)
{
    retailHours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 18, Minutes = 0 }
    });
}

// Friday: Extended hours - 9 AM - 9 PM
retailHours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Friday,
    StartTime = new TimeRange { Hours = 9, Minutes = 0 },
    EndTime = new TimeRange { Hours = 21, Minutes = 0 }
});

// Saturday: 10 AM - 7 PM
retailHours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Saturday,
    StartTime = new TimeRange { Hours = 10, Minutes = 0 },
    EndTime = new TimeRange { Hours = 19, Minutes = 0 }
});

// Sunday: Limited hours - 12 PM - 5 PM
retailHours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Sunday,
    StartTime = new TimeRange { Hours = 12, Minutes = 0 },
    EndTime = new TimeRange { Hours = 17, Minutes = 0 }
});

stack.AddHoursOfOperation(retailHours);
```

### Example 5: Multiple Schedules for Different Teams

```csharp
// Sales team hours
var salesHours = new HoursOfOperation
{
    Name = "SalesHours",
    Description = "Sales team availability",
    TimeZone = "America/New_York"
};

for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    salesHours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 8, Minutes = 0 },
        EndTime = new TimeRange { Hours = 18, Minutes = 0 }
    });
}

stack.AddHoursOfOperation(salesHours);

// Technical support hours (24/7)
var techSupportHours = new HoursOfOperation
{
    Name = "TechSupportHours",
    Description = "24/7 technical support",
    TimeZone = "UTC"
};

for (var day = DayOfWeek.Sunday; day <= DayOfWeek.Saturday; day++)
{
    techSupportHours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 0, Minutes = 0 },
        EndTime = new TimeRange { Hours = 23, Minutes = 59 }
    });
}

stack.AddHoursOfOperation(techSupportHours);

// Use with queues
var salesQueue = new QueueBuilder().SetName("Sales").Build();
stack.AddQueue(salesQueue, "SalesHours");

var techQueue = new QueueBuilder().SetName("TechSupport").Build();
stack.AddQueue(techQueue, "TechSupportHours");
```

---

## Best Practices

### 1. Use Correct Timezone

Always set the timezone for your business location:

```csharp
// Good - Specific timezone
var hours = new HoursOfOperation
{
    Name = "EastCoastHours",
    TimeZone = "America/New_York"  // Handles daylight saving automatically
};

// Avoid - Generic abbreviations don't work
var hours = new HoursOfOperation
{
    Name = "Hours",
    TimeZone = "EST"  // ❌ This won't work!
};
```

**Why this matters:** IANA timezones automatically handle daylight saving time changes.

### 2. Use UTC for Global 24/7 Operations

For always-available services, use UTC:

```csharp
var globalSupport = new HoursOfOperation
{
    Name = "GlobalSupport",
    TimeZone = "UTC"  // No daylight saving complications
};
```

### 3. Document Special Schedules

Add descriptions for non-standard schedules:

```csharp
var holidayHours = new HoursOfOperation
{
    Name = "ThanksgivingHours",
    Description = "Special hours for Thanksgiving week - Nov 20-26, 2024",
    TimeZone = "America/New_York"
};
```

### 4. Create Reusable Helper Methods

Build helper methods for common patterns:

```csharp
public static class HoursHelper
{
    public static HoursOfOperation Create24x7(string name, string description = "")
    {
        var hours = new HoursOfOperation
        {
            Name = name,
            Description = description,
            TimeZone = "UTC"
        };

        for (var day = DayOfWeek.Sunday; day <= DayOfWeek.Saturday; day++)
        {
            hours.AddDayConfig(new HoursOfOperationConfig
            {
                Day = day,
                StartTime = new TimeRange { Hours = 0, Minutes = 0 },
                EndTime = new TimeRange { Hours = 23, Minutes = 59 }
            });
        }

        return hours;
    }

    public static HoursOfOperation CreateWeekdayHours(
        string name,
        string timezone,
        int startHour,
        int endHour,
        string description = "")
    {
        var hours = new HoursOfOperation
        {
            Name = name,
            Description = description,
            TimeZone = timezone
        };

        for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
        {
            hours.AddDayConfig(new HoursOfOperationConfig
            {
                Day = day,
                StartTime = new TimeRange { Hours = startHour, Minutes = 0 },
                EndTime = new TimeRange { Hours = endHour, Minutes = 0 }
            });
        }

        return hours;
    }
}

// Usage
var support24x7 = HoursHelper.Create24x7("24x7Support", "Always available");
var businessHours = HoursHelper.CreateWeekdayHours(
    "BusinessHours",
    "America/New_York",
    9,
    17,
    "Standard M-F 9-5"
);

stack.AddHoursOfOperation(support24x7);
stack.AddHoursOfOperation(businessHours);
```

### 5. Validate Hours Before Deployment

Ensure your time ranges are valid:

```csharp
var hours = new HoursOfOperation
{
    Name = "BusinessHours",
    TimeZone = "America/New_York"
};

// Add configurations...

hours.Validate(); // Throws exception if invalid
stack.AddHoursOfOperation(hours); // Also validates automatically
```

---

## Common Patterns

### Pattern 1: Standard 9-5 Weekdays

Most common business hours:

```csharp
var standard = new HoursOfOperation
{
    Name = "Standard9to5",
    TimeZone = "America/New_York"
};

for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    standard.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 17, Minutes = 0 }
    });
}
```

### Pattern 2: Extended Weekday + Limited Weekend

Longer weekday hours with reduced weekend availability:

```csharp
var extended = new HoursOfOperation
{
    Name = "ExtendedWithWeekend",
    TimeZone = "America/Chicago"
};

// Weekdays: 8 AM - 8 PM
for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    extended.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 8, Minutes = 0 },
        EndTime = new TimeRange { Hours = 20, Minutes = 0 }
    });
}

// Saturday: 10 AM - 4 PM
extended.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Saturday,
    StartTime = new TimeRange { Hours = 10, Minutes = 0 },
    EndTime = new TimeRange { Hours = 16, Minutes = 0 }
});
```

### Pattern 3: Lunch Break Hours

Split schedule with lunch break:

```csharp
// Note: Amazon Connect hours don't support breaks within a day
// Workaround: Create two separate schedules and check both in flow

var morningHours = new HoursOfOperation
{
    Name = "MorningHours",
    TimeZone = "America/New_York"
};

var afternoonHours = new HoursOfOperation
{
    Name = "AfternoonHours",
    TimeZone = "America/New_York"
};

for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    // Morning: 9 AM - 12 PM
    morningHours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 12, Minutes = 0 }
    });

    // Afternoon: 1 PM - 5 PM
    afternoonHours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 13, Minutes = 0 },
        EndTime = new TimeRange { Hours = 17, Minutes = 0 }
    });
}
```

---

## Timezone Reference

### US Timezones

| Timezone | IANA Identifier |
|----------|-----------------|
| Eastern | `America/New_York` |
| Central | `America/Chicago` |
| Mountain | `America/Denver` |
| Pacific | `America/Los_Angeles` |
| Alaska | `America/Anchorage` |
| Hawaii | `Pacific/Honolulu` |

### International Timezones

| Region | IANA Identifier |
|--------|-----------------|
| London | `Europe/London` |
| Paris | `Europe/Paris` |
| Tokyo | `Asia/Tokyo` |
| Sydney | `Australia/Sydney` |
| Dubai | `Asia/Dubai` |
| São Paulo | `America/Sao_Paulo` |

### Special Timezones

- **UTC** - `UTC` (Coordinated Universal Time, no daylight saving)
- **GMT** - `GMT` (Greenwich Mean Time)

**Find More Timezones:** [IANA Timezone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

---

## Next Steps

Now that you understand hours of operation:

1. **[Building Queues →](./queues.md)** - Associate hours with queues
2. **[Building Flows →](./flows.md)** - Check hours in contact flows
3. **[Complete Example →](./complete-example.md)** - See everything working together

---

## Related Resources

- [SwitchboardStack Reference](/reference/stack.md) - `AddHoursOfOperation()` method details
- [Queue Building Guide](./queues.md) - Using hours with queues
- [Flow Building Guide](./flows.md) - Checking hours in flows
