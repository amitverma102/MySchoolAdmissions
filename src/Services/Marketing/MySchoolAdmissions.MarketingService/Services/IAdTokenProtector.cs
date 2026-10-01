namespace MySchoolAdmissions.MarketingService.Services;

public interface IAdTokenProtector
{
    string Protect(string value);
    string Unprotect(string value);
}
