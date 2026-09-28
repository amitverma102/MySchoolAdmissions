FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Services/Reporting/MySchoolAdmissions.ReportingService/MySchoolAdmissions.ReportingService.csproj", "src/Services/Reporting/MySchoolAdmissions.ReportingService/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.Core/MySchoolAdmissions.Core.csproj", "src/BuildingBlocks/MySchoolAdmissions.Core/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.EventBus/MySchoolAdmissions.EventBus.csproj", "src/BuildingBlocks/MySchoolAdmissions.EventBus/"]
RUN dotnet restore "src/Services/Reporting/MySchoolAdmissions.ReportingService/MySchoolAdmissions.ReportingService.csproj"
COPY . .
WORKDIR "/src/src/Services/Reporting/MySchoolAdmissions.ReportingService"
RUN dotnet build "MySchoolAdmissions.ReportingService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MySchoolAdmissions.ReportingService.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS basefinal
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MySchoolAdmissions.ReportingService.dll"]
