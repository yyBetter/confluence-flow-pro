/**
 * Confluence Flow Pro - Background Service Worker
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'download_pdf') {
        chrome.downloads.download({
            url: request.url,
            filename: `Confluence_Exports/${request.filename}`,
            saveAs: false // 自动保存到下载目录下的子目录
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, downloadId: downloadId });
            }
        });
        return true; // Keep message channel open for async response
    }
});
