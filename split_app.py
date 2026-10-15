import re
import os

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    app_content = f.read()

# 1. Split imports, body, and return statement
imports_match = re.search(r'^(.*?)(?=\nexport default function App\(\) \{)', app_content, re.DOTALL)
imports = imports_match.group(1)

app_declaration = 'export default function App() {'
start_idx = app_content.find(app_declaration) + len(app_declaration)
return_idx = app_content.rfind('  return (')

app_body = app_content[start_idx:return_idx].strip()
app_return = app_content[return_idx:].strip()

# Remove the trailing "}" of the App component from the return string
app_return = app_return[:-1].strip()

# 2. Extract UI parts from the return statement
# Left column config
config_start = app_return.find('{/* Left Column: Config */}')
right_column_start = app_return.find('{/* Right Column: Terminal Logs */}')
review_modal_start = app_return.find('{reviewItems && (')

header_and_config_html = app_return[config_start:right_column_start].strip()
terminal_html = app_return[right_column_start:review_modal_start].strip()

# Review modal is from review_modal_start to just before the last </div>
review_modal_html = app_return[review_modal_start:app_return.rfind('</div>', 0, app_return.rfind('</div>', 0, app_return.rfind('</div>')))].strip()
# Adjust to close it perfectly. We know Review modal ends with "</div>\n        </div>\n      )}"
review_end_idx = review_modal_html.rfind(')}') + 2
review_modal_html = review_modal_html[:review_end_idx]

# Remove the review modal from terminal html
terminal_html = terminal_html[:terminal_html.find('{reviewItems && (')].strip()
# Remove trailing div tags that belonged to the main layout
terminal_html = terminal_html[:terminal_html.rfind('</div>')].strip()

# 3. Create components directory
os.makedirs('src/components', exist_ok=True)
os.makedirs('src/hooks', exist_ok=True)

# 4. Create useDubbingEngine.ts
hook_content = f"""{imports}

export function useDubbingEngine() {{
  {app_body}

  return {{
    ttsProvider, setTtsProvider,
    aivoicesKeysStr, setAivoicesKeysStr,
    apiKeysStr, setApiKeysStr,
    geminiApiKeysStr, setGeminiApiKeysStr,
    voiceId, setVoiceId,
    srtFile, setSrtFile,
    isProcessing, setIsProcessing,
    processingProvider, setProcessingProvider,
    progress, setProgress,
    logs, setLogs,
    resultUrl, setResultUrl,
    resultSrtUrl, setResultSrtUrl,
    autoFit, setAutoFit,
    reviewItems, setReviewItems,
    approvedRewrites, setApprovedRewrites,
    useRubberBandStretch, setUseRubberBandStretch,
    fixedSpeed, setFixedSpeed,
    maxAutoFitSpeed, setMaxAutoFitSpeed,
    minAutoFitSpeed, setMinAutoFitSpeed,
    smartGroup, setSmartGroup,
    groupGap, setGroupGap,
    aiRewrite, setAiRewrite,
    concurrency, setConcurrency,
    mode, setMode,
    aivoicesList, setAivoicesList,
    logsEndRef,
    handleFileChange,
    handleAnalyzeScript,
    saveRewrites,
    startDubbing
  }};
}}
"""
with open('src/hooks/useDubbingEngine.ts', 'w', encoding='utf-8') as f:
    f.write(hook_content)

# 5. Create ConfigSidebar.tsx
config_content = f"""import React from 'react';
import {{ Upload, Play, Loader2, FileText, Download }} from 'lucide-react';

export default function ConfigSidebar({{ engine }}: {{ engine: any }}) {{
  const {{
    ttsProvider, setTtsProvider, aivoicesKeysStr, setAivoicesKeysStr, apiKeysStr, setApiKeysStr,
    geminiApiKeysStr, setGeminiApiKeysStr, voiceId, setVoiceId, srtFile, setSrtFile,
    isProcessing, progress, autoFit, setAutoFit, reviewItems, useRubberBandStretch, setUseRubberBandStretch,
    fixedSpeed, setFixedSpeed, maxAutoFitSpeed, setMaxAutoFitSpeed, minAutoFitSpeed, setMinAutoFitSpeed,
    smartGroup, setSmartGroup, groupGap, setGroupGap, aiRewrite, setAiRewrite,
    concurrency, setConcurrency, mode, setMode, aivoicesList,
    handleFileChange, handleAnalyzeScript, startDubbing, resultUrl, resultSrtUrl, processingProvider
  }} = engine;

  return (
    <>
{header_and_config_html}
    </>
  );
}}
"""
with open('src/components/ConfigSidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(config_content)

# 6. Create TerminalLogs.tsx
terminal_content = f"""import React from 'react';
import {{ Terminal }} from 'lucide-react';

export default function TerminalLogs({{ engine }}: {{ engine: any }}) {{
  const {{ logs, logsEndRef }} = engine;
  
  return (
{terminal_html}
  );
}}
"""
with open('src/components/TerminalLogs.tsx', 'w', encoding='utf-8') as f:
    f.write(terminal_content)

# 7. Create ReviewModal.tsx
review_content = f"""import React from 'react';
import {{ CheckCircle2 }} from 'lucide-react';

export default function ReviewModal({{ engine }}: {{ engine: any }}) {{
  const {{ reviewItems, setReviewItems, saveRewrites }} = engine;
  
  if (!reviewItems) return null;
  
  return (
    <>
{review_modal_html}
    </>
  );
}}
"""
with open('src/components/ReviewModal.tsx', 'w', encoding='utf-8') as f:
    f.write(review_content)

# 8. Create new App.tsx
new_app_content = f"""import React from 'react';
import {{ useDubbingEngine }} from './hooks/useDubbingEngine';
import ConfigSidebar from './components/ConfigSidebar';
import TerminalLogs from './components/TerminalLogs';
import ReviewModal from './components/ReviewModal';
import './index.css';

export default function App() {{
  const engine = useDubbingEngine();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <ConfigSidebar engine={{engine}} />
        </div>
        <div className="lg:col-span-7 flex flex-col h-[600px] lg:h-[800px] bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden">
          <TerminalLogs engine={{engine}} />
        </div>
      </div>
      <ReviewModal engine={{engine}} />
    </div>
  );
}}
"""
with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(new_app_content)

print("Split completed successfully!")
