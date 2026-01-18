var builder = DistributedApplication.CreateBuilder(args);

// API service
var api = builder.AddProject<Projects.FriendsPrediction_Api>("api");

// Static files frontend
var web = builder.AddProject<Projects.FriendsPrediction_Web>("web")
    .WithReference(api)
    .WaitFor(api);

builder.Build().Run();
