chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.type === 'WEBHOOK') {
        fetch(req.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selection: req.text, url: sender.tab.url })
        }).catch(err => console.error('Webhook fail:', err))
        sendResponse({ success: true })
    }
    return true // Async response
})