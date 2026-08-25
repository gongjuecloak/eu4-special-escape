import * as vscode from 'vscode';

export interface DetectionResult {
    utf8: boolean;
    newVersion: boolean;
    label: string;
    confidence: number;
}

const PRESETS: DetectionResult[] = [
    { utf8: true, newVersion: true, label: 'EU4 1.26+', confidence: 0.9 },
    { utf8: true, newVersion: false, label: 'EU4 旧版本', confidence: 0.7 },
    { utf8: false, newVersion: false, label: 'CK2 兼容模式', confidence: 0.5 }
];

export function detectFileType(document: vscode.TextDocument): DetectionResult | null {
    const fileName = document.fileName;
    const text = document.getText();
    
    // 根据文件路径判断
    if (fileName.includes('localisation') || fileName.includes('localization')) {
        // 检测是否已经是转义格式
        if (text.includes('\x10') || text.includes('\x11')) {
            return { utf8: true, newVersion: true, label: '已转义', confidence: 1.0 };
        }
        
        // 检测是否包含特殊字符
        const hasSpecial = [...text].some(ch => ch.codePointAt(0)! > 255);
        if (hasSpecial) {
            return { utf8: true, newVersion: true, label: '需要转义', confidence: 0.95 };
        }
    }
    
    if (fileName.includes('events') || fileName.includes('decisions')) {
        return { utf8: true, newVersion: false, label: 'EU4 旧版', confidence: 0.8 };
    }
    
    return null;
}

export function getRecommendedPreset(document: vscode.TextDocument): DetectionResult | null {
    const detected = detectFileType(document);
    if (detected) return detected;
    
    // 默认推荐
    const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
    const utf8 = config.get('utf8', true);
    const newVersion = config.get('newVersion', true);
    
    return PRESETS.find(p => p.utf8 === utf8 && p.newVersion === newVersion) || PRESETS[0];
}