cat > src/extension.ts << 'EOF'
import * as vscode from 'vscode';

function cp1252ToUtf8(char: number): number {
    const map: Record<number, number> = {
        0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
        0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6,
        0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152,
        0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
        0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
        0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
        0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178
    };
    return map[char] || char;
}

function specialEscape(char: string, toUtf8: boolean, newVersion: boolean): string {
    if (char.codePointAt(0)! < 256) {
        return char;
    }
    const hex = char.codePointAt(0)!.toString(16);
    let low = parseInt(hex.slice(-2), 16);
    let high = parseInt(hex.slice(0, 2), 16);
    
    let lowByteOffset = newVersion ? 14 : 15;
    const highByteOffset = -9;
    
    const internalChars = [
        0x00, 0x0A, 0x0D, 0x20, 0x22, 0x24,
        0x40, 0x5B, 0x5C, 0x7B, 0x7D, 0x7E, 0x80,
        0xA3, 0xA4, 0xA7, 0xBD, 0x3B, 0x5D, 0x5F, 0x3D, 0x23
    ];
    
    if (toUtf8) {
        internalChars.push(0x2F);
        if (!newVersion) {
            const index = internalChars.indexOf(0x20);
            if (index > -1) {
                internalChars.splice(index, 1);
            }
        }
    }
    
    let escapeChr = 0x10;
    if (internalChars.includes(high)) escapeChr += 2;
    if (internalChars.includes(low)) escapeChr++;
    
    switch (escapeChr) {
        case 0x11: low += lowByteOffset; break;
        case 0x12: high += highByteOffset; break;
        case 0x13: low += lowByteOffset; high += highByteOffset; break;
    }
    
    if (toUtf8) {
        low = cp1252ToUtf8(low);
        high = cp1252ToUtf8(high);
    }
    
    return [escapeChr, low, high].map(c => String.fromCodePoint(c)).join('');
}

function encodeText(text: string, options: { utf8: boolean; newVersion: boolean }): string {
    return [...text].map(ch => specialEscape(ch, options.utf8, options.newVersion)).join('');
}

// 状态栏管理
let statusBarItem: vscode.StatusBarItem | undefined;

function updateStatusBar() {
    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
    }
    const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
    const utf8 = config.get('utf8', true);
    const newVersion = config.get('newVersion', true);
    statusBarItem.text = `$(symbol-constant) EU4 ${utf8 ? 'UTF-8' : 'Latin1'} ${newVersion ? 'v2' : 'v1'}`;
    statusBarItem.tooltip = '点击切换 EU4 转义设置';
    statusBarItem.command = 'eu4-special-escape.toggleSettings';
    statusBarItem.show();
}

export function activate(context: vscode.ExtensionContext) {
    console.log('EU4 Special Escape 已激活 v0.0.2');
    
    // 显示状态栏
    updateStatusBar();
    
    // 监听配置变化
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('eu4SpecialEscape')) {
                updateStatusBar();
            }
        })
    );
    
    // 转义命令
    let escapeCommand = vscode.commands.registerCommand('eu4-special-escape.escape', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('❌ 请打开一个文件');
            return;
        }
        
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        
        if (!text) {
            vscode.window.showErrorMessage('❌ 请选中需要转义的文本');
            return;
        }
        
        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const utf8 = config.get('utf8', true);
        const newVersion = config.get('newVersion', true);
        
        try {
            const escaped = encodeText(text, { utf8, newVersion });
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, escaped);
            });
            vscode.window.showInformationMessage(`✅ 转义完成！共处理 ${[...text].length} 个字符`);
        } catch (error) {
            vscode.window.showErrorMessage(`❌ 转义失败：${error}`);
        }
    });
    
    // 切换设置命令
    let toggleCommand = vscode.commands.registerCommand('eu4-special-escape.toggleSettings', async () => {
        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const currentUtf8 = config.get('utf8', true);
        const currentNew = config.get('newVersion', true);
        
        const selected = await vscode.window.showQuickPick([
            { label: `切换 UTF-8 模式`, description: `当前: ${currentUtf8 ? '开启' : '关闭'}` },
            { label: `切换版本规则`, description: `当前: ${currentNew ? '1.26+' : '旧版'}` }
        ]);
        
        if (selected) {
            if (selected.label.includes('UTF-8')) {
                await config.update('utf8', !currentUtf8, true);
                vscode.window.showInformationMessage(`UTF-8 模式已${!currentUtf8 ? '开启' : '关闭'}`);
            } else if (selected.label.includes('版本')) {
                await config.update('newVersion', !currentNew, true);
                vscode.window.showInformationMessage(`版本规则已切换为 ${!currentNew ? '1.26+' : '旧版'}`);
            }
            updateStatusBar();
        }
    });
    
    context.subscriptions.push(escapeCommand, toggleCommand);
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
EOF