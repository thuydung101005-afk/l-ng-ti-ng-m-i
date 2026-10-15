import re

with open('src/hooks/useDubbingEngine.ts', 'r', encoding='utf-8') as f:
    engine_content = f.read()

# 1. Revoke old URLs at the start
old_init = """    setIsProcessing(true);
    setProcessingProvider(activeProvider);
    setProgress(0);
    setLogs([]);
    setResultUrl(null);
    setResultSrtUrl(null);"""

new_init = """    setIsProcessing(true);
    setProcessingProvider(activeProvider);
    setProgress(0);
    setLogs([]);
    
    // Thu hồi bộ nhớ của kết quả cũ (nếu có)
    setResultUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setResultSrtUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });"""

engine_content = engine_content.replace(old_init, new_init)

# 2. Close audioCtx in Local OmniVoice mode
old_finish_local = """        addLog('🎉 Hoàn thành!', 'success');
        setIsProcessing(false);
    };"""

new_finish_local = """        addLog('🎉 Hoàn thành!', 'success');
        setIsProcessing(false);
        try { audioCtx.close(); } catch(e) {}
    };"""
engine_content = engine_content.replace(old_finish_local, new_finish_local)

# 3. Close audioCtx in API mode
old_finish_api = """      const srtObjectUrl = URL.createObjectURL(srtBlob);
      setResultSrtUrl(srtObjectUrl);

            if (reportListRef.current.length > 0) {"""

new_finish_api = """      const srtObjectUrl = URL.createObjectURL(srtBlob);
      setResultSrtUrl(srtObjectUrl);
      
      try { audioCtx.close(); } catch(e) {}

            if (reportListRef.current.length > 0) {"""
engine_content = engine_content.replace(old_finish_api, new_finish_api)

with open('src/hooks/useDubbingEngine.ts', 'w', encoding='utf-8') as f:
    f.write(engine_content)

print("Memory leaks patched successfully!")
