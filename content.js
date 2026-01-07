/**
 * Confluence Flow Pro - Content Script (Compatibility V2)
 */

(function () {
    console.log("Confluence Flow Pro loaded.");

    function injectButton() {
        if (document.getElementById('cfp-btn-container')) return;

        const container = document.createElement('div');
        container.id = 'cfp-btn-container';
        container.style.cssText = 'position:fixed; bottom:30px; right:30px; z-index:10000; display:flex; flex-direction:column; gap:10px; align-items:flex-end;';

        const btn = document.createElement('button');
        btn.id = 'cfp-quick-export-btn';
        btn.className = 'cfp-main-btn';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            极速导出当前页
        `;
        btn.onclick = handleExport;

        const batchBtn = document.createElement('button');
        batchBtn.id = 'cfp-batch-export-btn';
        batchBtn.className = 'cfp-main-btn batch';
        batchBtn.style.background = 'linear-gradient(135deg, #ff8c00 0%, #ff4500 100%)';
        batchBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            一键下载所有子文档
        `;
        batchBtn.style.display = 'none';
        batchBtn.onclick = handleBatchExport;

        container.appendChild(batchBtn);
        container.appendChild(btn);
        document.body.appendChild(container);
    }

    // 解决侧边栏识别的兼容性函数
    function findSubPageLinks() {
        // 尝试寻找当前选中的侧边栏节点
        const selectors = [
            '.plugin_pagetree_current',
            '.aui-nav-selected',
            '.ia-sidebar .active',
            'a.current'
        ];

        let activeEl = null;
        for (const s of selectors) {
            activeEl = document.querySelector(s);
            if (activeEl) break;
        }

        if (!activeEl) return [];

        // 在父级 li 或最近的容器中寻找 ul > li > a
        const container = activeEl.closest('li') || activeEl.parentElement;
        const subLinks = container.querySelectorAll('ul a');

        return Array.from(subLinks).filter(a => a.href.includes('pageId='));
    }

    function detectSubPages() {
        const links = findSubPageLinks();
        const batchBtn = document.getElementById('cfp-batch-export-btn');
        if (batchBtn) {
            batchBtn.style.display = links.length > 0 ? 'flex' : 'none';
            if (links.length > 0) {
                batchBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    一键下载子文档 (${links.length}个)
                `;
            }
        }
    }

    async function handleBatchExport() {
        const links = findSubPageLinks();
        if (links.length === 0) return showToast("📭 未检测到子文档");

        showToast(`🚀 任务队列已开启: 0/${links.length}`);

        for (let i = 0; i < links.length; i++) {
            const a = links[i];
            const url = new URL(a.href);
            const pageId = url.searchParams.get('pageId');
            const rawTitle = a.innerText.trim();
            // 清洗非法字符
            const cleanTitle = rawTitle.replace(/[\\/:\*\?"<>\|]/g, '_');

            const exportUrl = `${window.location.origin}/spaces/flyingpdf/pdfpageexport.action?pageId=${pageId}`;

            await new Promise(resolve => {
                chrome.runtime.sendMessage({
                    action: 'download_pdf',
                    url: exportUrl,
                    filename: `${cleanTitle}.pdf`
                }, () => {
                    setTimeout(resolve, 1500); // 增加间隔到1.5秒，确保稳定
                });
            });
            showToast(`进度：${i + 1}/${links.length}`);
        }
        showToast("✅ 全部任务已完成");
    }

    function handleExport() {
        const params = new URLSearchParams(window.location.search);
        const pageId = params.get('pageId');
        if (!pageId) return showToast("⚠️ 未能识别 Page ID");

        const title = document.querySelector('#title-text')?.innerText?.trim() || "Confluence_Page";
        const cleanTitle = title.replace(/[\\/:\*\?"<>\|]/g, '_');
        const exportUrl = `${window.location.origin}/spaces/flyingpdf/pdfpageexport.action?pageId=${pageId}`;

        chrome.runtime.sendMessage({
            action: 'download_pdf',
            url: exportUrl,
            filename: `${cleanTitle}.pdf`
        }, (res) => {
            showToast(res?.success ? "✅ 已开始下载" : "❌ 下载失败");
            if (!res?.success) window.location.href = exportUrl; // 回退方案
        });
    }

    function showToast(message) {
        let toast = document.getElementById('cfp-toast-v2');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'cfp-toast-v2';
            toast.style.cssText = 'position:fixed; bottom:150px; right:30px; z-index:10001; background:rgba(23,43,77,0.9); color:white; padding:12px 20px; border-radius:8px; font-size:13px; box-shadow:0 4px 12px rgba(0,0,0,0.3); backdrop-filter:blur(4px); pointer-events:none;';
            document.body.appendChild(toast);
        }
        toast.innerText = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }

    // 初始执行
    injectButton();
    setInterval(detectSubPages, 2000); // 每2秒轮询一次扫描，解决异步加载问题

    // 路由变化监听
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            injectButton();
        }
    }).observe(document, { subtree: true, childList: true });

})();
