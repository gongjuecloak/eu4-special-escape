import * as vscode from 'vscode';

interface Preset {
    label: string;
    utf8: boolean;
    newVersion: boolean;
    description?: string;
}

const BUILTIN_PRESETS: Preset[] = [
    { label: 'EU4 1.26+ (推荐)', utf8: true, newVersion: true, description: '最新EU4版本' },
    { label: 'EU4 旧版本', utf8: true, newVersion: false, description: 'EU4 1.25及以下' },
    { label: 'CK2 兼容模式', utf8: false, newVersion: false, description: 'CK2游戏' },
    { label: 'Stellaris', utf8: true, newVersion: true, description: '群星游戏' }
];

export class PresetManager {
    static async loadPreset(): Promise<void> {
        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const customPresets = config.get<Preset[]>('presets', []);
        const allPresets = [...BUILTIN_PRESETS, ...customPresets];

        const selected = await vscode.window.showQuickPick(
            allPresets.map(p => ({
                label: p.label,
                description: p.description || '',
                detail: `UTF-8: ${p.utf8 ? '开启' : '关闭'} | 版本: ${p.newVersion ? '1.26+' : '旧版'}`
            })),
            { placeHolder: '选择配置预设' }
        );

        if (!selected) return;

        const preset = allPresets.find(p => p.label === selected.label);
        if (!preset) return;

        await config.update('utf8', preset.utf8, true);
        await config.update('newVersion', preset.newVersion, true);
        
        vscode.window.showInformationMessage(`✅ 已加载 ${preset.label} 配置`);
    }

    static async createPreset(): Promise<void> {
        // 创建自定义预设
        const name = await vscode.window.showInputBox({
            prompt: '输入预设名称',
            placeHolder: '我的EU4配置'
        });
        
        if (!name) return;

        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const utf8 = config.get('utf8', true);
        const newVersion = config.get('newVersion', true);
        
        const presets = config.get<Preset[]>('presets', []);
        presets.push({ label: name, utf8, newVersion });
        await config.update('presets', presets, true);
        
        vscode.window.showInformationMessage(`✅ 预设 ${name} 已保存`);
    }
}