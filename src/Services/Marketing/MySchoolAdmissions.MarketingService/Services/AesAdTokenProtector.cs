using System.Security.Cryptography;
using System.Text;

namespace MySchoolAdmissions.MarketingService.Services;

public sealed class AesAdTokenProtector(IConfiguration configuration) : IAdTokenProtector
{
    private const int NonceSize = 12;
    private const int TagSize = 16;

    private byte[] GetKey()
    {
        var configuredKey = configuration["AdIntegrations:TokenEncryptionKey"];
        if (string.IsNullOrWhiteSpace(configuredKey))
            throw new InvalidOperationException("AdIntegrations:TokenEncryptionKey must be stored in Azure Key Vault or another secret store before connecting ad accounts.");

        byte[] key;
        try
        {
            key = Convert.FromBase64String(configuredKey);
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException("AdIntegrations:TokenEncryptionKey must be a base64-encoded 256-bit key.", ex);
        }

        if (key.Length != 32)
            throw new InvalidOperationException("AdIntegrations:TokenEncryptionKey must decode to exactly 32 bytes.");

        return key;
    }

    public string Protect(string value)
    {
        var key = GetKey();
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var plaintext = Encoding.UTF8.GetBytes(value);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[TagSize];

        using (var aes = new AesGcm(key, TagSize))
            aes.Encrypt(nonce, plaintext, ciphertext, tag);

        var result = new byte[NonceSize + TagSize + ciphertext.Length];
        Buffer.BlockCopy(nonce, 0, result, 0, NonceSize);
        Buffer.BlockCopy(tag, 0, result, NonceSize, TagSize);
        Buffer.BlockCopy(ciphertext, 0, result, NonceSize + TagSize, ciphertext.Length);
        CryptographicOperations.ZeroMemory(key);
        CryptographicOperations.ZeroMemory(plaintext);
        return Convert.ToBase64String(result);
    }

    public string Unprotect(string value)
    {
        var payload = Convert.FromBase64String(value);
        if (payload.Length < NonceSize + TagSize)
            throw new CryptographicException("Stored ad platform credential is malformed.");

        var key = GetKey();
        var nonce = payload.AsSpan(0, NonceSize);
        var tag = payload.AsSpan(NonceSize, TagSize);
        var ciphertext = payload.AsSpan(NonceSize + TagSize);
        var plaintext = new byte[ciphertext.Length];
        using (var aes = new AesGcm(key, TagSize))
            aes.Decrypt(nonce, ciphertext, tag, plaintext);
        CryptographicOperations.ZeroMemory(key);
        try
        {
            return Encoding.UTF8.GetString(plaintext);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }
}
