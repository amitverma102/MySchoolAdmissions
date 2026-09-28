FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Services/Identity/MySchoolAdmissions.IdentityService/MySchoolAdmissions.IdentityService.csproj", "src/Services/Identity/MySchoolAdmissions.IdentityService/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.Core/MySchoolAdmissions.Core.csproj", "src/BuildingBlocks/MySchoolAdmissions.Core/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.EventBus/MySchoolAdmissions.EventBus.csproj", "src/BuildingBlocks/MySchoolAdmissions.EventBus/"]
RUN dotnet restore "src/Services/Identity/MySchoolAdmissions.IdentityService/MySchoolAdmissions.IdentityService.csproj"
COPY . .
WORKDIR "/src/src/Services/Identity/MySchoolAdmissions.IdentityService"
RUN dotnet build "MySchoolAdmissions.IdentityService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MySchoolAdmissions.IdentityService.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MySchoolAdmissions.IdentityService.dll"]
