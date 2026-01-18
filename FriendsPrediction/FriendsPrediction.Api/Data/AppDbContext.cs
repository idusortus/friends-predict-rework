using Microsoft.EntityFrameworkCore;
using FriendsPrediction.Api.Models;

namespace FriendsPrediction.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Trade> Trades => Set<Trade>();
    public DbSet<Position> Positions => Set<Position>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Use friendsbets schema (shared database pattern)
        modelBuilder.HasDefaultSchema("friendsbets");

        // Configure indexes for performance
        modelBuilder.Entity<Event>()
            .HasIndex(e => e.CreatedById);

        modelBuilder.Entity<Trade>()
            .HasIndex(t => t.EventId);

        modelBuilder.Entity<Trade>()
            .HasIndex(t => t.UserId);

        modelBuilder.Entity<Position>()
            .HasIndex(p => new { p.EventId, p.UserId, p.Prediction })
            .IsUnique();
    }
}
