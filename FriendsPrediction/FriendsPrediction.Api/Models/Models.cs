using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FriendsPrediction.Api.Models;

/// <summary>
/// A player in the prediction game.
/// </summary>
public class User
{
    [Key]
    [MaxLength(12)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Balance { get; set; } = 100.00m;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// A prediction event/question that users can bet on.
/// </summary>
public class Event
{
    [Key]
    [MaxLength(12)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    [MaxLength(12)]
    public string CreatedById { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Status { get; set; } = "open"; // open, resolved

    public bool? Outcome { get; set; } // true = yes, false = no, null = not resolved

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ResolvedAt { get; set; }
}

/// <summary>
/// A trade (bet) placed by a user on an event.
/// </summary>
public class Trade
{
    [Key]
    [MaxLength(12)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(12)]
    public string EventId { get; set; } = string.Empty;

    [Required]
    [MaxLength(12)]
    public string UserId { get; set; } = string.Empty;

    public bool Prediction { get; set; } // true = yes, false = no

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Amount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// A user's aggregated position on an event.
/// </summary>
public class Position
{
    [Key]
    [MaxLength(12)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(12)]
    public string EventId { get; set; } = string.Empty;

    [Required]
    [MaxLength(12)]
    public string UserId { get; set; } = string.Empty;

    public bool Prediction { get; set; } // true = yes, false = no

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Amount { get; set; }
}
