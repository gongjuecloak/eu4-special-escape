import * as vscode from 'vscode';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'eu4-special-escape.toggleSettings';
        this.statusBarItem.tooltip = '点击切换EU4转义设置';
        this.statusBarItem.show();
    }

    update(): void {
        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const utf8 = config.get('utf8', true);
        const newVersion = config.get('newVersion', true);
        const cacheEnabled = config.get('enableCache', true);
        
        const mode = utf8 ? 'UTF-8' : 'Latin1';
        const version = newVersion ? 'v2' : 'v1';
        const cache = cacheEnabled ? '📦' : '';
        
        this.statusBarItem.text = `$(symbol-constant) EU4 ${mode} ${version} ${cache}`;
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}