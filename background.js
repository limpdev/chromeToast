import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    hr: '---',
    linkStyle: 'inlined'
})
turndownService.use(gfm)
turndownService.addRule('removeHidden', {
    filter: el => el.style && (el.style.display === 'none' || el.style.visibility === 'hidden'),
    replacement: () => ''
})
turndownService.addRule('lineBreak', {
    filter: 'br',
    replacement: () => '  \n'
})

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.type === 'MARKDOWN') {
        sendResponse({ markdown: turndownService.turndown(req.html) })
    }
    else if (req.type === 'WEBHOOK') {
        fetch(req.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selection: req.text, url: sender.tab.url })
        }).catch(err => console.error('Webhook fail:', err))
        sendResponse({ success: true })
    }
    return true // Async response
})