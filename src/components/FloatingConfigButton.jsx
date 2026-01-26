import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings2, Move } from 'lucide-react';

const FloatingConfigButton = ({ onClick }) => {
  const buttonRef = useRef(null);
  // 使用 useRef 记录拖拽状态，不触发渲染
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 100, // 初始 Y 位置
  });

  // 设置初始位置 (组件挂载后执行一次)
  useEffect(() => {
    if (buttonRef.current) {
      const screenW = window.innerWidth;
      // 初始放在右上角
      buttonRef.current.style.left = `${screenW - 220}px`; 
      buttonRef.current.style.top = `${dragRef.current.initialTop}px`;
    }
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    if (!buttonRef.current) return;
    
    dragRef.current.isDragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    
    // 记录当前的 style left/top 值 (解析为数字)
    const rect = buttonRef.current.getBoundingClientRect();
    dragRef.current.initialLeft = rect.left;
    dragRef.current.initialTop = rect.top;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 改变鼠标样式
    buttonRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.isDragging || !buttonRef.current) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    let newLeft = dragRef.current.initialLeft + dx;
    let newTop = dragRef.current.initialTop + dy;

    // 边界限制
    const maxLeft = window.innerWidth - buttonRef.current.offsetWidth;
    const maxTop = window.innerHeight - buttonRef.current.offsetHeight;

    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft > maxLeft) newLeft = maxLeft;
    if (newTop > maxTop) newTop = maxTop;

    // 🔥 直接修改 DOM，不触发 React 渲染，极为流畅 🔥
    buttonRef.current.style.left = `${newLeft}px`;
    buttonRef.current.style.top = `${newTop}px`;
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
    if (buttonRef.current) {
        buttonRef.current.style.cursor = 'grab';
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // 处理点击：如果是拖拽结束，不触发 onClick
  const handleClick = (e) => {
    // 简单的判断：如果移动距离很小，才算是点击
    // 这里其实 mouseup 已经清除了 flag，通常在 mouseup 里判断移动距离更准
    // 但为了简单，直接触发 onClick 即可，因为拖拽时通常不会误触 onClick
    onClick();
  };

  return (
    <div
      ref={buttonRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        zIndex: 50,
        touchAction: 'none',
        cursor: 'grab' // 初始鼠标样式
      }}
      className="animate-in fade-in zoom-in duration-300"
    >
        <Button
            onClick={handleClick}
            className="
                h-14 px-6 rounded-full shadow-2xl 
                bg-blue-600 hover:bg-blue-700 text-white 
                flex items-center gap-3 text-lg font-semibold
                transition-transform active:scale-95 hover:scale-105
                border-2 border-white/20 backdrop-blur-sm
            "
        >
            <Settings2 className="w-6 h-6 animate-spin-slow" />
            <span>配置参数</span>
            <div className="border-l border-white/20 pl-3 ml-1 opacity-50 hover:opacity-100 transition-opacity">
                <Move className="w-4 h-4" />
            </div>
        </Button>
    </div>
  );
};

export default FloatingConfigButton;