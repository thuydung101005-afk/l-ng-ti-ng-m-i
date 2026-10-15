import React from 'react';
import { Upload, Play, Loader2, FileText, Download, CheckCircle2 } from 'lucide-react';

export default function ConfigSidebar({ engine }: { engine: any }) {
  const {
    ttsProvider, setTtsProvider, aivoicesKeysStr, setAivoicesKeysStr, apiKeysStr, setApiKeysStr,
    geminiApiKeysStr, setGeminiApiKeysStr, voiceId, setVoiceId, srtFile, setSrtFile,
    isProcessing, progress, autoFit, setAutoFit, reviewItems, useRubberBandStretch, setUseRubberBandStretch,
    fixedSpeed, setFixedSpeed, maxAutoFitSpeed, setMaxAutoFitSpeed, minAutoFitSpeed, setMinAutoFitSpeed,
    smartGroup, setSmartGroup, groupGap, setGroupGap, aiRewrite, setAiRewrite, requireReview, setRequireReview, reviewQueueItems, setReviewQueueItems, handleApprove,
    concurrency, setConcurrency, mode, setMode, aivoicesList,
    handleFileChange, startDubbing, resultUrl, resultSrtUrl, processingProvider
  } = engine;

  return (
    <>
{/* Left Column: Config */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
              VClip Auto Dub
            </h1>
            <p className="text-gray-500 mt-2">
              Công cụ lồng tiếng phim song song tự động. Biến SRT thành audio ghép chuẩn thời gian chạy ngay trên trình duyệt của bạn.
            </p>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-medium tracking-tight">Cấu hình</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nguồn Giọng Đọc (TTS Provider)</label>
                <select
                  value={ttsProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value as 'vclip' | 'aivoices';
                    setTtsProvider(newProvider);
                    if (newProvider === 'aivoices' && aivoicesList.length > 0) {
                      setVoiceId(aivoicesList[0].voice_id);
                    } else if (newProvider === 'vclip') {
                      setVoiceId('mhsL3CPLxmLYdSTKp3GANz');
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  disabled={isProcessing}
                >
                  <option value="vclip">VClip API (sk_live_...)</option>
                  <option value="aivoices">AIVoices (achihub.com) (aiv_...)</option>
                </select>
              </div>

              {ttsProvider === 'vclip' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">API Key VClip (Chỉ sử dụng 1 key đầu tiên để tránh lỗi ID giọng)</label>
                  <textarea 
                    rows={3}
                    value={apiKeysStr} 
                    onChange={(e) => setApiKeysStr(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    disabled={isProcessing}
                    placeholder="sk_live_key1&#10;sk_live_key2"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">API Key AIVoices (Nhập nhiều key luân phiên)</label>
                  <textarea 
                    rows={3}
                    value={aivoicesKeysStr} 
                    onChange={(e) => setAivoicesKeysStr(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    disabled={isProcessing}
                    placeholder="aiv_key1&#10;aiv_key2"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">API Key AI Rút gọn (Hỗ trợ Gemini, xAI Grok hoặc DeepSeek, nhập nhiều key luân phiên)</label>
                <textarea 
                  rows={2}
                  value={geminiApiKeysStr} 
                  onChange={(e) => setGeminiApiKeysStr(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  disabled={isProcessing}
                  placeholder="AIzaSy...&#10;AIzaSy..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Voice ID (Giọng đọc)</label>
                {ttsProvider === 'aivoices' ? (
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    disabled={isProcessing}
                  >
                    {aivoicesList.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} - {voice.gender === 'female' ? 'Nữ' : 'Nam'} ({voice.region === 'northern' ? 'Miền Bắc' : voice.region === 'southern' ? 'Miền Nam' : voice.region === 'central' ? 'Miền Trung' : voice.region})
                      </option>
                    ))}
                    {aivoicesList.length === 0 && <option value={voiceId}>{voiceId}</option>}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value="mhsL3CPLxmLYdSTKp3GANz" 
                    readOnly
                    className="w-full border border-gray-300 bg-gray-100 rounded-lg px-4 py-2 font-mono text-sm focus:outline-none"
                    disabled={isProcessing}
                  />
                )}
              </div>


              <div className="space-y-4 md:col-span-2">
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <label className="text-sm font-semibold text-orange-900 mb-3 block">Chế độ xử lý</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-start space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        value="continuous" 
                        checked={mode === 'continuous'} 
                        onChange={() => setMode('continuous')} 
                        disabled={isProcessing} 
                        className="mt-1 text-orange-600 focus:ring-orange-500" 
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-orange-900">Đọc liền mạch (Rất nhanh, 1 file)</span>
                        <span className="text-xs text-orange-700/80">Ghép tất cả thoại thành 1 đoạn văn và đọc một lần. Phù hợp làm sách nói, thuyết minh. Mất mốc thời gian SRT gốc.</span>
                      </div>
                    </label>
                    <label className="flex items-start space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        value="dubbing" 
                        checked={mode === 'dubbing'} 
                        onChange={() => setMode('dubbing')} 
                        disabled={isProcessing} 
                        className="mt-1 text-orange-600 focus:ring-orange-500" 
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-orange-900">Lồng tiếng (Rất chậm, khớp Timeline)</span>
                        <span className="text-xs text-orange-700/80">Xử lý từng câu một để khớp chính xác thời gian video. Yêu cầu nhiều API calls, phù hợp video ngắn.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className={`bg-purple-50/50 p-4 rounded-xl border border-purple-100 transition-colors ${mode === 'continuous' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="flex items-start space-x-3 cursor-pointer hover:opacity-80">
                    <input 
                      type="checkbox" 
                      checked={smartGroup}
                      onChange={(e) => setSmartGroup(e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                      disabled={isProcessing}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-purple-900">Gom cụm thông minh (Xử lý âm điệu tự nhiên như chuyên nghiệp)</span>
                      <span className="text-xs text-purple-700/80 mt-1">Các đoạn phụ đề gần sát nhau sẽ được gom liền mạch thành một đoạn văn để máy đọc cùng một tốc độ và nhịp thở, tránh được tình trạng câu ngắn đọc nhanh, câu dài đọc chậm hoặc bị giật cục.</span>
                    </div>
                  </label>
                  
                  {smartGroup && (
                    <div className="pl-8 mt-4 border-t border-purple-100/50 pt-3">
                      <label className="text-sm font-medium text-purple-800 block mb-1">Khoảng cách nối thoại tối đa (giây)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0.1"
                        max="2.0"
                        value={groupGap} 
                        onChange={(e) => setGroupGap(parseFloat(e.target.value))}
                        className="w-32 border border-purple-200 rounded-lg px-3 py-1.5 font-mono text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none bg-white"
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-purple-700/70 mt-1">Gom các câu có khoảng cách liền kề nhỏ hơn mức này. Phụ đề có dấu gạch ngang (-) ở đầu sẽ luôn được tách riêng (để chuyển người nói).</p>
                    </div>
                  )}
                </div>

                <div className={`bg-blue-50/50 p-4 rounded-xl border border-blue-100 transition-colors ${mode === 'continuous' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="flex items-start space-x-3 cursor-pointer hover:opacity-80">
                    <input 
                      type="checkbox" 
                      checked={autoFit}
                      onChange={(e) => setAutoFit(e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                      disabled={isProcessing}
                    />
                    <div className="flex flex-col">
                      
                      
                      <span className="text-sm font-semibold text-blue-900">Tính năng Autofit & AI Rewrite (Khuyên dùng)</span>
                      <span className="text-xs text-blue-700/80 mt-1">Hệ thống sẽ tự động đo lường và co giãn tốc độ để ép khít thoại vào video.</span>
                    </div>
                  </label>
                  
                  {autoFit && (
                    <div className="pl-8 mt-2 mb-4 space-y-2">
                      <div className="flex items-center space-x-3 bg-blue-50/50 p-2 rounded border border-blue-100">
                        <span className="text-sm font-medium text-blue-900">Ngưỡng TỐI THIỂU:</span>
                        <input 
                          type="number" 
                          step="0.05"
                          min="0.5"
                          max="2.0"
                          value={minAutoFitSpeed}
                          onChange={(e) => setMinAutoFitSpeed(Number(e.target.value))}
                          className="w-20 p-1 border border-blue-200 rounded focus:ring-blue-500 text-sm"
                          disabled={isProcessing}
                        />
                        <span className="text-xs text-gray-600">x (Ưu tiên đọc ở tốc độ này)</span>
                      </div>
                      
                      <div className="flex items-center space-x-3 bg-red-50/50 p-2 rounded border border-red-100">
                        <span className="text-sm font-medium text-red-900">Ngưỡng TỐI ĐA:</span>
                        <input 
                          type="number" 
                          step="0.05"
                          min="1.0"
                          max="2.0"
                          value={maxAutoFitSpeed}
                          onChange={(e) => setMaxAutoFitSpeed(Number(e.target.value))}
                          className="w-20 p-1 border border-red-200 rounded focus:ring-red-500 text-sm"
                          disabled={isProcessing}
                        />
                        <span className="text-xs text-gray-600">x (Vượt ngưỡng này AI sẽ tự rút gọn câu)</span>
                      </div>
                    </div>
                  )}


                  
                  {!autoFit && (
                    <div className="pl-8 mt-4 border-t border-blue-100/50 pt-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-blue-900">Tốc độ cố định:</span>
                        <input 
                          type="number" 
                          step="0.05"
                          min="0.5"
                          max="3.0"
                          value={fixedSpeed}
                          onChange={(e) => setFixedSpeed(Number(e.target.value))}
                          className="w-20 p-1 border border-gray-300 rounded focus:ring-blue-500 text-sm"
                          disabled={isProcessing}
                        />
                        <span className="text-xs text-gray-500">x (Sẽ dùng tốc độ này cho mọi câu)</span>
                      </div>
                    </div>
                  )}

                  <div className="pl-8 mt-4 border-t border-blue-100/50 pt-3">
                    <label className="flex items-start space-x-3 cursor-pointer hover:opacity-80">
                      <input 
                        type="checkbox" 
                        checked={useRubberBandStretch}
                        onChange={(e) => setUseRubberBandStretch(e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        disabled={isProcessing}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-blue-900">Sử dụng Rubber Band ép tốc độ (Time-Stretch)</span>
                        <span className="text-xs text-blue-700/80 mt-1">Tắt để nghe âm thanh thô 1.0x nguyên bản. Chú ý: Nếu tắt, âm thanh có thể tràn sang câu sau gây lỗi.</span>
                      </div>
                    </label>
                  </div>
                  
                  {autoFit && (
                  <>
                    <div className="pl-8 mt-4 border-t border-blue-100/50 pt-3">
                      <label className="flex items-start space-x-3 cursor-pointer hover:opacity-80">
                        <input 
                          type="checkbox" 
                          checked={aiRewrite}
                          onChange={(e) => setAiRewrite(e.target.checked)}
                          className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                          disabled={isProcessing}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-blue-900">AI Tự động rút gọn câu (Tốc độ &gt; {maxAutoFitSpeed}x)</span>
                          <span className="text-xs text-blue-700/80 mt-1">Tích hợp AI (Gemini/Grok/DeepSeek): Thay vì ép tốc độ đọc quá nhanh, AI sẽ nhận diện các câu quá dài và tự động viết lại ngắn gọn nhưng vẫn giữ nguyên ý nghĩa, đảm bảo thoại luôn mượt mà.</span>
                        </div>
                      </label>
                    </div>

                    {aiRewrite && (
                      <div className="pl-16 mt-2 mb-2">
                        <label className="flex items-start space-x-2 cursor-pointer hover:opacity-80">
                          <input 
                            type="checkbox" 
                            checked={requireReview}
                            onChange={(e) => setRequireReview(e.target.checked)}
                            className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            disabled={isProcessing}
                          />
                          <span className="text-xs font-medium text-blue-800">Hiển thị Bảng Kiểm Duyệt để tôi sửa lại văn phong trước khi máy tạo âm thanh. (Tắt đi để máy chạy Auto-Pilot 100%).</span>
                        </label>
                      </div>
                    )}

                    <div className="mt-4 border-t border-blue-100/50 pt-3">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-blue-900 block">Số tiến trình đồng thời (Concurrency)</label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="number" 
                            min="1"
                            max="20"
                            value={concurrency}
                            onChange={(e) => setConcurrency(parseInt(e.target.value) || 1)}
                            className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                            disabled={isProcessing}
                          />
                          <span className="text-xs text-blue-700/80">Số luồng xử lý song song. Tăng lên để render nhanh hơn.</span>
                        </div>
                      </div>
                    </div>
                  </>
                  )}
                </div>
              </div>
              
              <div className="pt-2">
                <label className="text-sm font-medium text-gray-700 block mb-2">Tệp phụ đề (.srt)</label>
                <label className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-xl appearance-none cursor-pointer hover:border-blue-400 hover:bg-blue-50 focus:outline-none">
                  <span className="flex items-center space-x-2">
                    <Upload className="w-6 h-6 text-gray-500" />
                    <span className="font-medium text-gray-500">
                      {srtFile ? srtFile.name : 'Click để chọn file SRT'}
                    </span>
                  </span>
                  <input type="file" accept=".srt" className="hidden" onChange={handleFileChange} disabled={isProcessing} />
                </label>
              </div>
            </div>
            {isProcessing && (
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden border border-gray-300">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ width: `${Math.max(5, progress)}%` }}
                >
                  {progress}%
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => startDubbing()}
                disabled={isProcessing || !srtFile}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all ${
                  isProcessing || !srtFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isProcessing && processingProvider !== 'omnivoice' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý (API)...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" /> Bắt đầu lồng tiếng (API)
                  </>
                )}
              </button>
              
              <button
                onClick={() => startDubbing('omnivoice')}
                disabled={isProcessing || !srtFile}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all ${
                  isProcessing || !srtFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg shadow-purple-500/30'
                }`}
              >
                {isProcessing && processingProvider === 'omnivoice' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý (Local)...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" /> 🎙️ Lồng tiếng Ngọc Huyền (Local GPU)
                  </>
                )}
              </button>
            </div>
          </div>

          {resultUrl && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 text-green-800 font-semibold">
                <CheckCircle2 className="w-5 h-5" /> Kết quả hoàn tất
              </div>
              <audio controls src={resultUrl} className="w-full" />
              <div className="flex flex-col sm:flex-row gap-3">
                <a 
                  href={resultUrl} 
                  download="final_dubbing.wav"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> Tải xuống tệp Audio
                </a>
                
                {resultSrtUrl && (
                  <a 
                    href={resultSrtUrl} 
                    download="revised_subtitles.srt"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 font-medium transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Tải file SRT gốc/chuẩn
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
    </>
  );
}
