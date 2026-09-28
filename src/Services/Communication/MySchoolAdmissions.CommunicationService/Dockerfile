FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Services/Communication/MySchoolAdmissions.CommunicationService/MySchoolAdmissions.CommunicationService.csproj", "src/Services/Communication/MySchoolAdmissions.CommunicationService/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.Core/MySchoolAdmissions.Core.csproj", "src/BuildingBlocks/MySchoolAdmissions.Core/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.EventBus/MySchoolAdmissions.EventBus.csproj", "src/BuildingBlocks/MySchoolAdmissions.EventBus/"]
RUN dotnet restore "src/Services/Communication/MySchoolAdmissions.CommunicationService/MySchoolAdmissions.CommunicationService.csproj"
COPY . .
WORKDIR "/src/src/Services/Communication/MySchoolAdmissions.CommunicationService"
RUN dotnet build "MySchoolAdmissions.CommunicationService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MySchoolAdmissions.CommunicationService.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MySchoolAdmissions.CommunicationService.dll"]
