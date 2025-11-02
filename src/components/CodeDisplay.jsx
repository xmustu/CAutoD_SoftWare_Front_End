// src/components/CodeDisplay.jsx

import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
// 引入你需要的语言的高亮工具，这里以 JavaScript 为例
// 如果是 Python 或其他语言，请根据需要调整导入
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript'; 
// 新增：导入 Python 语言支持
import 'prismjs/components/prism-python'; // <--- 新增这行

// 建议使用更柔和的深色主题
import 'prismjs/themes/prism-tomorrow.css'; // 这是一个柔和的深色主题
// 或者如果你想保留 VSC 的风格，使用 vscDarkPlus（如果你在用 SyntaxHighlighter）

const CodeDisplay = ({ code = '', language = 'python' }) => { // 默认语言改为 python 更合理
  // PrismJS 的高亮函数
  const codeHighlighter = (code) => {
    // 确保能找到 python 语言
    const lang = languages[language] || languages.python || languages.clike; 
    return highlight(code, lang);
  };

  return (
    <div className="border rounded-lg overflow-hidden my-4 bg-gray-50 shadow-inner">
      <div className="bg-gray-200 px-4 py-2 text-sm font-mono text-gray-700 border-b">
        {`Generated Code (${language})`}
      </div>
      <Editor
        value={code}
        onValueChange={() => {}} // 禁用编辑功能
        highlight={codeHighlighter}
        padding={10}
        style={{
          fontFamily: '"Fira code", "Fira Mono", monospace',
          fontSize: 14,
          minHeight: '200px', // 设置最小高度
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
};

export default CodeDisplay;