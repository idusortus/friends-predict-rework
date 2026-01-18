FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY ["FriendsPrediction.Api/FriendsPrediction.Api.csproj", "FriendsPrediction.Api/"]
COPY ["FriendsPrediction.ServiceDefaults/FriendsPrediction.ServiceDefaults.csproj", "FriendsPrediction.ServiceDefaults/"]
RUN dotnet restore "FriendsPrediction.Api/FriendsPrediction.Api.csproj"
COPY . .
WORKDIR "/src/FriendsPrediction.Api"
RUN dotnet build "FriendsPrediction.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "FriendsPrediction.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "FriendsPrediction.Api.dll"]
