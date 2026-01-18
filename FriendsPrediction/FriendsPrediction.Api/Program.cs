using Microsoft.EntityFrameworkCore;
using FriendsPrediction.Api.Data;
using FriendsPrediction.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// Add Aspire service defaults
builder.AddServiceDefaults();

// Configure EF Core with Azure SQL retry logic
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("PredictionsDb");
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
    });
});

// Configure CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Apply pending migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseCors();
app.MapDefaultEndpoints();

// ========== USER ENDPOINTS ==========

app.MapGet("/api/users", async (AppDbContext db) =>
    await db.Users.OrderBy(u => u.DisplayName).ToListAsync());

app.MapGet("/api/users/{id}", async (string id, AppDbContext db) =>
    await db.Users.FindAsync(id) is User user
        ? Results.Ok(user)
        : Results.NotFound());

app.MapPost("/api/users", async (CreateUserRequest request, AppDbContext db) =>
{
    var user = new User
    {
        Id = GenerateId(),
        DisplayName = request.DisplayName,
        Balance = 100.00m, // Starting balance
        CreatedAt = DateTime.UtcNow
    };
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Created($"/api/users/{user.Id}", user);
});

// ========== EVENT ENDPOINTS ==========

app.MapGet("/api/events", async (AppDbContext db) =>
    await db.Events.OrderByDescending(e => e.CreatedAt).ToListAsync());

app.MapGet("/api/events/{id}", async (string id, AppDbContext db) =>
    await db.Events.FindAsync(id) is Event evt
        ? Results.Ok(evt)
        : Results.NotFound());

app.MapPost("/api/events", async (CreateEventRequest request, AppDbContext db) =>
{
    var evt = new Event
    {
        Id = GenerateId(),
        Title = request.Title,
        Description = request.Description,
        CreatedById = request.CreatedById,
        Status = "open",
        CreatedAt = DateTime.UtcNow
    };
    db.Events.Add(evt);
    await db.SaveChangesAsync();
    return Results.Created($"/api/events/{evt.Id}", evt);
});

app.MapPost("/api/events/{id}/resolve", async (string id, ResolveEventRequest request, AppDbContext db) =>
{
    var evt = await db.Events.FindAsync(id);
    if (evt == null) return Results.NotFound();
    if (evt.Status != "open") return Results.BadRequest("Event is not open");

    evt.Status = "resolved";
    evt.Outcome = request.Outcome;
    evt.ResolvedAt = DateTime.UtcNow;

    // Settle positions - winners get paid from losers
    var positions = await db.Positions.Where(p => p.EventId == id).ToListAsync();
    foreach (var position in positions)
    {
        var user = await db.Users.FindAsync(position.UserId);
        if (user == null) continue;

        if (position.Prediction == request.Outcome)
        {
            // Winner: return stake + winnings (simplified 2x payout)
            user.Balance += position.Amount * 2;
        }
        // Losers already paid when they placed the bet
    }

    await db.SaveChangesAsync();
    return Results.Ok(evt);
});

// ========== TRADE ENDPOINTS ==========

app.MapGet("/api/trades", async (AppDbContext db) =>
    await db.Trades
        .OrderByDescending(t => t.CreatedAt)
        .Take(50)
        .ToListAsync());

app.MapGet("/api/events/{eventId}/trades", async (string eventId, AppDbContext db) =>
    await db.Trades
        .Where(t => t.EventId == eventId)
        .OrderByDescending(t => t.CreatedAt)
        .ToListAsync());

app.MapPost("/api/trades", async (CreateTradeRequest request, AppDbContext db) =>
{
    // Validate user exists and has sufficient balance
    var user = await db.Users.FindAsync(request.UserId);
    if (user == null) return Results.BadRequest("User not found");
    if (user.Balance < request.Amount) return Results.BadRequest("Insufficient balance");

    // Validate event exists and is open
    var evt = await db.Events.FindAsync(request.EventId);
    if (evt == null) return Results.BadRequest("Event not found");
    if (evt.Status != "open") return Results.BadRequest("Event is not open for trading");

    // Use execution strategy for transaction
    var strategy = db.Database.CreateExecutionStrategy();
    
    var trade = await strategy.ExecuteAsync(async () =>
    {
        using var transaction = await db.Database.BeginTransactionAsync();
        
        // Deduct from user balance
        user.Balance -= request.Amount;

        // Create trade record
        var newTrade = new Trade
        {
            Id = GenerateId(),
            EventId = request.EventId,
            UserId = request.UserId,
            Prediction = request.Prediction,
            Amount = request.Amount,
            CreatedAt = DateTime.UtcNow
        };
        db.Trades.Add(newTrade);

        // Update or create position
        var position = await db.Positions
            .FirstOrDefaultAsync(p => p.EventId == request.EventId && 
                                      p.UserId == request.UserId && 
                                      p.Prediction == request.Prediction);

        if (position != null)
        {
            position.Amount += request.Amount;
        }
        else
        {
            position = new Position
            {
                Id = GenerateId(),
                EventId = request.EventId,
                UserId = request.UserId,
                Prediction = request.Prediction,
                Amount = request.Amount
            };
            db.Positions.Add(position);
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        
        return newTrade;
    });

    return Results.Created($"/api/trades/{trade.Id}", trade);
});

// ========== POSITION ENDPOINTS ==========

app.MapGet("/api/positions", async (AppDbContext db) =>
    await db.Positions.ToListAsync());

app.MapGet("/api/users/{userId}/positions", async (string userId, AppDbContext db) =>
    await db.Positions.Where(p => p.UserId == userId).ToListAsync());

app.MapGet("/api/events/{eventId}/positions", async (string eventId, AppDbContext db) =>
    await db.Positions.Where(p => p.EventId == eventId).ToListAsync());

app.Run();

// ========== HELPER FUNCTIONS ==========

static string GenerateId() => Guid.NewGuid().ToString("N")[..12];

// ========== REQUEST DTOS ==========

record CreateUserRequest(string DisplayName);
record CreateEventRequest(string Title, string Description, string CreatedById);
record CreateTradeRequest(string EventId, string UserId, bool Prediction, decimal Amount);
record ResolveEventRequest(bool Outcome);
