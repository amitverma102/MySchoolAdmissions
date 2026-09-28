FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Services/Marketing/MySchoolAdmissions.MarketingService/MySchoolAdmissions.MarketingService.csproj", "src/Services/Marketing/MySchoolAdmissions.MarketingService/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.Core/MySchoolAdmissions.Core.csproj", "src/BuildingBlocks/MySchoolAdmissions.Core/"]
RUN dotnet restore "src/Services/Marketing/MySchoolAdmissions.MarketingService/MySchoolAdmissions.MarketingService.csproj"
COPY . .
WORKDIR "/src/src/Services/Marketing/MySchoolAdmissions.MarketingService"
RUN dotnet build "MySchoolAdmissions.MarketingService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MySchoolAdmissions.MarketingService.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MySchoolAdmissions.MarketingService.dll"]
