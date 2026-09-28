FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Services/Institution/MySchoolAdmissions.InstitutionService/MySchoolAdmissions.InstitutionService.csproj", "src/Services/Institution/MySchoolAdmissions.InstitutionService/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.Core/MySchoolAdmissions.Core.csproj", "src/BuildingBlocks/MySchoolAdmissions.Core/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.EventBus/MySchoolAdmissions.EventBus.csproj", "src/BuildingBlocks/MySchoolAdmissions.EventBus/"]
RUN dotnet restore "src/Services/Institution/MySchoolAdmissions.InstitutionService/MySchoolAdmissions.InstitutionService.csproj"
COPY . .
WORKDIR "/src/src/Services/Institution/MySchoolAdmissions.InstitutionService"
RUN dotnet build "MySchoolAdmissions.InstitutionService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MySchoolAdmissions.InstitutionService.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MySchoolAdmissions.InstitutionService.dll"]
