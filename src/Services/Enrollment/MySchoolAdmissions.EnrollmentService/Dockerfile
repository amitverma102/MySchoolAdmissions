FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Services/Enrollment/MySchoolAdmissions.EnrollmentService/MySchoolAdmissions.EnrollmentService.csproj", "src/Services/Enrollment/MySchoolAdmissions.EnrollmentService/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.Core/MySchoolAdmissions.Core.csproj", "src/BuildingBlocks/MySchoolAdmissions.Core/"]
COPY ["src/BuildingBlocks/MySchoolAdmissions.EventBus/MySchoolAdmissions.EventBus.csproj", "src/BuildingBlocks/MySchoolAdmissions.EventBus/"]
RUN dotnet restore "src/Services/Enrollment/MySchoolAdmissions.EnrollmentService/MySchoolAdmissions.EnrollmentService.csproj"
COPY . .
WORKDIR "/src/src/Services/Enrollment/MySchoolAdmissions.EnrollmentService"
RUN dotnet build "MySchoolAdmissions.EnrollmentService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MySchoolAdmissions.EnrollmentService.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MySchoolAdmissions.EnrollmentService.dll"]
