FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Services/Configuration/MySchoolAdmissions.ConfigurationService/MySchoolAdmissions.ConfigurationService.csproj", "src/Services/Configuration/MySchoolAdmissions.ConfigurationService/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.Core/MySchoolAdmissions.Core.csproj", "src/BuildingBlocks/MySchoolAdmissions.Core/"]
RUN dotnet restore "src/Services/Configuration/MySchoolAdmissions.ConfigurationService/MySchoolAdmissions.ConfigurationService.csproj"
COPY . .
WORKDIR "/src/src/Services/Configuration/MySchoolAdmissions.ConfigurationService"
RUN dotnet build "MySchoolAdmissions.ConfigurationService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MySchoolAdmissions.ConfigurationService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MySchoolAdmissions.ConfigurationService.dll"]
