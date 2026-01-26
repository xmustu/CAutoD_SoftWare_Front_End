import React from 'react';

const RemoteDesktopPage = () => {
  // 这里填后端的完整地址
  const remoteUrl = "http://localhost:8080/api/remote/"; 

  return (
    <div className="w-full h-screen flex flex-col">
      {/* 简单的顶部导航，方便返回 */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center h-14">
        <h1 className="text-lg font-bold">远程桌面控制台 (Demo)</h1>
        <button 
          onClick={() => window.history.back()} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded text-sm"
        >
          返回上一页
        </button>
      </div>

      {/* 核心部分：利用 iframe 嵌入后端返回的 HTML */}
      <div className="flex-1 w-full bg-black">
        <iframe 
          src={remoteUrl}
          title="Remote Desktop"
          width="100%"
          height="100%"
          style={{ border: 'none' }}
          allow="fullscreen"
        />
      </div>
    </div>
  );
};


export default RemoteDesktopPage;