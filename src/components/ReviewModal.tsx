import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function ReviewModal({ engine }: { engine: any }) {
  const { reviewItems, setReviewItems, saveRewrites } = engine;
  
  if (!reviewItems) return null;
  
  return (
    <>
{reviewItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-blue-900">Kiểm duyệt Kịch bản Rút gọn</h3>
                <p className="text-sm text-blue-700 mt-1">Hệ thống phát hiện {reviewItems.length} câu quá dài. Dưới đây là đề xuất rút gọn của AI.</p>
              </div>
              <button onClick={() => setReviewItems(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-4">
                {reviewItems.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Bản gốc (Bị lố {item.estimatedSpeed.toFixed(2)}x tốc độ)</div>
                        <div className="text-gray-800 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">{item.original}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-blue-600 uppercase mb-1">Bản rút gọn (Bác có thể sửa)</div>
                        <textarea
                          value={item.shortened}
                          onChange={(e) => {
                            const newItems = [...reviewItems];
                            newItems[idx].shortened = e.target.value;
                            setReviewItems(newItems);
                          }}
                          className="w-full text-sm text-blue-900 bg-blue-50/30 border border-blue-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-white flex justify-end space-x-3">
              <button onClick={() => setReviewItems(null)} className="px-6 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100">Hủy bỏ</button>
              <button onClick={saveRewrites} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Lưu & Tiếp tục Lồng tiếng</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
