FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/ApiGateway/MySchoolAdmissions.ApiGateway/MySchoolAdmissions.ApiGateway.csproj", "src/ApiGateway/MySchoolAdmissions.ApiGateway/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.Core/MySchoolAdmissions.Core.csproj", "src/BuildingBlocks/MySchoolAdmissions.Core/"]
RUN dotnet restore "src/ApiGateway/MySchoolAdmissions.ApiGateway/MySchoolAdmissions.ApiGateway.csproj"
COPY . .
WORKDIR "/src/src/ApiGateway/MySchoolAdmissions.ApiGateway"
RUN dotnet build "MySchoolAdmissions.ApiGateway.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MySchoolAdmissions.ApiGateway.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MySchoolAdmissions.ApiGateway.dll"]
