import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
/**
 * 通用分页组件
 * 支持基于 limit/offset 的分页逻辑
 */
const Pagination = ({ 
  currentPage, 
  hasMore, 
  limit, 
  totalItems = null,
  onPageChange,
  className = ''
}) => {
  const canGoPrevious = currentPage > 1;
  const canGoNext = hasMore;
  return (
    <div className={`flex items-center justify-between mt-6 ${className}`}>
      <div className="text-sm text-gray-600">
        第 {currentPage} 页
        {totalItems !== null && ` · 共 ${totalItems} 条记录`}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="flex items-center gap-1"
        >
          下一页
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
export default Pagination;