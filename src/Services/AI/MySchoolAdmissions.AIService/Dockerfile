FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Services/AI/MySchoolAdmissions.AIService/MySchoolAdmissions.AIService.csproj", "src/Services/AI/MySchoolAdmissions.AIService/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.Core/MySchoolAdmissions.Core.csproj", "src/BuildingBlocks/MySchoolAdmissions.Core/"]
RUN dotnet restore "src/Services/AI/MySchoolAdmissions.AIService/MySchoolAdmissions.AIService.csproj"
COPY . .
WORKDIR "/src/src/Services/AI/MySchoolAdmissions.AIService"
RUN dotnet build "MySchoolAdmissions.AIService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MySchoolAdmissions.AIService.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MySchoolAdmissions.AIService.dll"]
