import * as vscode from 'vscode';
import { encodeText } from '../core/encoder';

export class PreviewProvider {
    private panel: vscode.WebviewPanel | undefined;

    show(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('请打开一个文件');
            return;
        }

        const text = editor.document.getText(editor.selection) || editor.document.getText();
        
        if (this.panel) {
            this.panel.reveal();
            this.updateContent(text);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'eu4EscapePreview',
            'EU4 转义预览',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.updateContent(text);

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, []);
    }

    private updateContent(text: string): void {
        if (!this.panel) return;

        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const utf8 = config.get('utf8', true);
        const newVersion = config.get('newVersion', true);
        
        const escaped = encodeText(text, { utf8, newVersion });
        const hex = [...escaped].map(ch => 
            '0x' + ch.codePointAt(0)!.toString(16).toUpperCase()
        ).join(' ');

        this.panel.webview.html = this.getHtml(text, escaped, hex);
    }

    private getHtml(original: string, escaped: string, hex: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        padding: 20px; 
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background: var(--vscode-editor-background);
                    }
                    .title { 
                        font-size: 18px; 
                        font-weight: bold; 
                        margin-bottom: 20px;
                        color: var(--vscode-textLink-foreground);
                    }
                    .row { 
                        display: flex; 
                        gap: 20px; 
                        margin-top: 20px; 
                    }
                    .col { 
                        flex: 1; 
                    }
                    .label { 
                        font-weight: bold; 
                        color: var(--vscode-textPreformat-foreground);
                        margin-bottom: 8px;
                    }
                    .content { 
                        background: var(--vscode-input-background);
                        padding: 12px; 
                        border-radius: 4px;
                        font-family: 'Courier New', monospace;
                        min-height: 40px;
                        border: 1px solid var(--vscode-input-border);
                        white-space: pre-wrap;
                        word-break: break-all;
                    }
                    .hex { 
                        color: var(--vscode-textLink-foreground); 
                    }
                    .stats {
                        margin-top: 20px;
                        padding: 12px;
                        background: var(--vscode-editor-background);
                        border-radius: 4px;
                        border: 1px solid var(--vscode-input-border);
                    }
                    .stat-item {
                        display: inline-block;
                        margin-right: 30px;
                    }
                    .stat-label {
                        font-weight: bold;
                        color: var(--vscode-textPreformat-foreground);
                    }
                    .stat-value {
                        color: var(--vscode-textLink-foreground);
                        font-family: 'Courier New', monospace;
                    }
                </style>
            </head>
            <body>
                <div class="title">🔍 转义预览</div>
                
                <div class="row">
                    <div class="col">
                        <div class="label">📄 原始文本</div>
                        <div class="content">${this.escapeHtml(original)}</div>
                    </div>
                    <div class="col">
                        <div class="label">🔀 转义后</div>
                        <div class="content">${this.escapeHtml(escaped)}</div>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <div class="label">🔢 十六进制</div>
                    <div class="content hex">${hex}</div>
                </div>
                
                <div class="stats">
                    <div class="stat-item">
                        <span class="stat-label">字符数：</span>
                        <span class="stat-value">${[...original].length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">转义后长度：</span>
                        <span class="stat-value">${[...escaped].length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">增加：</span>
                        <span class="stat-value">+${[...escaped].length - [...original].length}</span>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
    }
}