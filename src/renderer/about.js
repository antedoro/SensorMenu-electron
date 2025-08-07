document.addEventListener('DOMContentLoaded', async () => {
    const appNameElement = document.getElementById('appName');
    const appVersionElement = document.getElementById('appVersion');
    const appAuthorElement = document.getElementById('appAuthor');

    try {
        const appInfo = await window.api.getAppInfo();
        appNameElement.innerText = appInfo.appName;
        appVersionElement.innerText = appInfo.version;
        appAuthorElement.innerText = `© 2025 ${appInfo.author}`; // Assuming 2025 as per GEMINI.md
    } catch (error) {
        console.error('Failed to get app info:', error);
        appNameElement.innerText = 'Error';
        appVersionElement.innerText = 'Error';
        appAuthorElement.innerText = 'Error';
    }
});