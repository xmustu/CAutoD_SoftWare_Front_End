export const safeParseMetadata = (rawMetadata) => {
    if (!rawMetadata) return {};
    if (typeof rawMetadata === 'string') {
        try {
            return JSON.parse(rawMetadata);
        } catch (e) {
            return {};
        }
    }
    return rawMetadata;
};

export const inferMessageType = (msg) => {
    const content = typeof msg.content === 'string' ? msg.content : '';
    const metadata = safeParseMetadata(msg.metadata);
    const parts = msg.parts || [];

    // 防误伤：强 Markdown 图表通常属于分析型的 ordinary content
    const hasMarkdownTable = content.includes('|---|') || content.includes('| --- |') || content.includes('|---|---|');

    if (!hasMarkdownTable) {
        const isOptimization = (
            parts.some(p => p.type === 'image' && (p.altText === '收敛曲线' || p.altText === '参数分布图' || p.altText === 'screenshot')) ||
            content.includes('=== 开始优化 ===') ||
            content.includes('已收到目标命令') || 
            content.includes('等待有效参数') ||
            content.includes('等待sub') || 
            content.includes('command=') ||
            (content.includes('info:') && content.includes('\n'))
        );
        if (isOptimization) return 'optimize';
    }

    const isGeometry = (
        metadata.code_file || metadata.stl_file || metadata.cad_file ||
        content.includes('import cadquery') || 
        content.includes('```python') ||
        content.includes('cadquery as cq') ||
        content.includes('show_object(')
    );
    if (isGeometry) return 'geometry';

    return 'general';
};

export const extractUniqueImages = (parts) => {
    if (!parts || !Array.isArray(parts)) return [];
    const seen = new Set();
    return parts.filter(p => p.type === 'image').filter(img => {
        const key = img.imageUrl || img.fileName;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};
