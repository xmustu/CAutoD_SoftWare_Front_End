import React from 'react'; // 移除 useState, useEffect
import useConversationStore from '@/store/conversationStore';
// import { downloadFileAPI } from '@/api/fileAPI'; // 不再需要下载API

const normalizeUrl = (rawSrc) => {
  if (!rawSrc) return '';

  // 已是绝对 URL，直接返回
  if (/^https?:\/\//i.test(rawSrc)) return rawSrc;

  // 统一去掉多余的 // 前缀
  const cleaned = String(rawSrc).replace(/^\/{2,}/, '/');

  // 针对后端静态文件：/files/{conversation_id}/{task_id}/{file_name}
  if (cleaned.startsWith('/files/')) {
    // 生产环境优先使用绝对地址，避免代理不可用
    const apiBase = (import.meta?.env?.PROD && import.meta?.env?.VITE_API_URL)
      ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '')
      : '';
    return apiBase ? `${apiBase}${cleaned}` : cleaned;
  }

  // 其他相对路径，保持原样（静态资源/public 下文件）
  return cleaned;
};

const ProtectedImage = ({ src, alt, ...props }) => {
  const { activeConversationId, activeTaskId } = useConversationStore.getState();
  let source = src;

  // 如果传入的是纯文件名（不以 / 开头且不是 http），构造标准 /files 路径
  if (source && !/^https?:\/\//i.test(source) && !source.startsWith('/')) {
    source = `/files/${activeConversationId}/${activeTaskId}/${source}`;
  }

  const finalSrc = normalizeUrl(source);

  if (!finalSrc) {
    return <div>图片路径缺失</div>;
  }

  // 更温和的错误处理：保留错误提示，不强制替换为跨域占位图
  const handleError = (e) => {
    const img = e.currentTarget;
    const apiBase = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');
    // 对 /files 路径做一次性前缀重试，避免代理异常或跨容器回环
    if (!img.dataset?.retried && finalSrc.startsWith('/files/') && apiBase) {
      img.dataset.retried = '1';
      img.src = `${apiBase}${finalSrc}`;
      return;
    }
    img.alt = '图片加载失败';
    console.error('图片加载失败:', finalSrc);
  };

  return <img src={finalSrc} alt={alt} onError={handleError} {...props} />;
};

export default ProtectedImage;
