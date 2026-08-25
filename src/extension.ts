import * as vscode from 'vscode';
import { encodeText, decodeText } from './core/encoder';
import { EscapeCache } from './utils/cache';
import { detectFileType, getRecommendedPreset } from './utils/detector';
import { ErrorHandler } from './utils/errorHandler';
import { StatusBarManager } from './ui/statusBar';
import { PreviewProvider } from './ui/preview';
import { PresetManager } from './utils/presets';
import { BatchProcessor } from './commands/batch';
import * as i18n from './i18n';

// 全局缓存实例
let cache: EscapeCache;

export function activate(context: vscode.ExtensionContext) {
    console.log('EU4 Special Escape 已激活 v0.1.0');

    // 初始化缓存
    cache = new EscapeCache();

    // 初始化状态栏
    const statusBar = new StatusBarManager();
    statusBar.update();

    // 监听配置变化
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('eu4SpecialEscape')) {
                statusBar.update();
                if (e.affectsConfiguration('eu4SpecialEscape.enableCache')) {
                    const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
                    if (!config.get('enableCache', true)) {
                        cache.clear();
                    }
                }
            }
        })
    );

    // 注册命令
    const commands = [
        registerEscapeCommand(),
        registerDecodeCommand(),
        registerBatchProcessCommand(),
        registerPreviewCommand(),
        registerAutoEscapeCommand(),
        registerLoadPresetCommand(),
        registerToggleSettingsCommand(),
        registerClearCacheCommand()
    ];

    context.subscriptions.push(...commands);
}

// 转义命令
function registerEscapeCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('eu4-special-escape.escape', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage(i18n.t('error.noEditor'));
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        if (!text) {
            vscode.window.showErrorMessage(i18n.t('error.noSelection'));
            return;
        }

        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const utf8 = config.get('utf8', true);
        const newVersion = config.get('newVersion', true);
        const enableCache = config.get('enableCache', true);

        try {
            let escaped: string;
            if (enableCache) {
                const cacheKey = `${text}|${utf8}|${newVersion}`;
                const cached = cache.get(cacheKey);
                if (cached) {
                    escaped = cached;
                } else {
                    escaped = encodeText(text, { utf8, newVersion });
                    cache.set(cacheKey, escaped);
                }
            } else {
                escaped = encodeText(text, { utf8, newVersion });
            }

            await editor.edit(editBuilder => {
                editBuilder.replace(selection, escaped);
            });

            const charCount = [...text].length;
            vscode.window.showInformationMessage(
                i18n.t('success.escape', { count: charCount.toString() })
            );
        } catch (error) {
            ErrorHandler.handle(error, i18n.t('error.escape'));
        }
    });
}

// 解码命令
function registerDecodeCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('eu4-special-escape.decode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage(i18n.t('error.noEditor'));
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        if (!text) {
            vscode.window.showErrorMessage(i18n.t('error.noSelection'));
            return;
        }

        try {
            const decoded = decodeText(text);
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, decoded);
            });
            vscode.window.showInformationMessage(i18n.t('success.decode'));
        } catch (error) {
            ErrorHandler.handle(error, i18n.t('error.decode'));
        }
    });
}

// 批量处理命令
function registerBatchProcessCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('eu4-special-escape.batchProcess', BatchProcessor.execute);
}

// 预览命令
function registerPreviewCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('eu4-special-escape.preview', () => {
        const provider = new PreviewProvider();
        provider.show();
    });
}

// 自动转义命令
function registerAutoEscapeCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('eu4-special-escape.autoEscape', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage(i18n.t('error.noEditor'));
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        if (!text) {
            vscode.window.showErrorMessage(i18n.t('error.noSelection'));
            return;
        }

        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const autoDetect = config.get('autoDetect', true);
        
        let utf8 = config.get('utf8', true);
        let newVersion = config.get('newVersion', true);

        if (autoDetect) {
            const detected = detectFileType(editor.document);
            const recommended = getRecommendedPreset(editor.document);
            if (recommended) {
                utf8 = recommended.utf8;
                newVersion = recommended.newVersion;
                vscode.window.showInformationMessage(
                    i18n.t('info.autoDetected', { preset: recommended.label })
                );
            }
        }

        try {
            const escaped = encodeText(text, { utf8, newVersion });
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, escaped);
            });
            vscode.window.showInformationMessage(i18n.t('success.escape', { count: [...text].length.toString() }));
        } catch (error) {
            ErrorHandler.handle(error, i18n.t('error.escape'));
        }
    });
}

// 加载预设命令
function registerLoadPresetCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('eu4-special-escape.loadPreset', PresetManager.loadPreset);
}

// 切换设置命令
function registerToggleSettingsCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('eu4-special-escape.toggleSettings', async () => {
        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const currentUtf8 = config.get('utf8', true);
        const currentNew = config.get('newVersion', true);

        const selected = await vscode.window.showQuickPick([
            { 
                label: `$(sync) 切换 UTF-8 模式`, 
                description: `当前: ${currentUtf8 ? '开启' : '关闭'}` 
            },
            { 
                label: `$(versions) 切换版本规则`, 
                description: `当前: ${currentNew ? '1.26+' : '旧版'}` 
            },
            { 
                label: `$(settings) 打开设置`, 
                description: '打开 EU4 Special Escape 配置' 
            }
        ]);

        if (!selected) return;

        if (selected.label.includes('UTF-8')) {
            await config.update('utf8', !currentUtf8, true);
            vscode.window.showInformationMessage(
                `UTF-8 模式已${!currentUtf8 ? '开启' : '关闭'}`
            );
        } else if (selected.label.includes('版本')) {
            await config.update('newVersion', !currentNew, true);
            vscode.window.showInformationMessage(
                `版本规则已切换为 ${!currentNew ? '1.26+' : '旧版'}`
            );
        } else if (selected.label.includes('设置')) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'eu4SpecialEscape');
        }
    });
}

// 清除缓存命令
function registerClearCacheCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('eu4-special-escape.clearCache', async () => {
        const confirm = await vscode.window.showInformationMessage(
            i18n.t('confirm.clearCache'),
            i18n.t('button.yes'),
            i18n.t('button.no')
        );

        if (confirm === i18n.t('button.yes')) {
            cache.clear();
            vscode.window.showInformationMessage(i18n.t('success.cacheCleared'));
        }
    });
}

export function deactivate() {
    if (cache) {
        cache.clear();
    }
}