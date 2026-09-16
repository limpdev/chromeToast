// chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
//     if (req.type === 'WEBHOOK') {
//         fetch(req.url, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ selection: req.text, url: sender.tab.url })
//         }).catch(err => console.error('Webhook fail:', err))
//         sendResponse({ success: true })
//     }
//     return true // Async response
// })
// In Chrome, you return true to keep a message channel open. In Firefox,
// the idiomatic (and more stable) way is to return a Promise.
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "WEBHOOK") {
    // Returning the fetch promise directly is the "Firefox way"
    return fetch(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selection: req.text, url: sender.tab.url }),
    })
      .then(() => ({ success: true }))
      .catch((err) => {
        console.error("Webhook fail:", err);
        return { success: false };
      });
  }
});
