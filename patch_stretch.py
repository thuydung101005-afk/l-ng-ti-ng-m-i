import re

with open('src/hooks/useDubbingEngine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
import_regex = r"import \{ mergeAudioClips, audioBufferToWav, timeStretchBuffer, timeStretchBufferRubberband \} from '\.\.\/lib\/audio';"
new_import = "import { mergeAudioClips, audioBufferToWav, timeStretchBuffer, timeStretchBufferRubberband, timeStretchBufferPitchPreserving } from '../lib/audio';"
content = re.sub(import_regex, new_import, content)

# 2. Inject applyTimeStretch helper
helper_func = """
  const applyTimeStretch = async (buffer: AudioBuffer, ratio: number) => {
      if (useRubberBandStretch) {
          return await timeStretchBufferRubberband(buffer, ratio);
      } else {
          return await timeStretchBufferPitchPreserving(buffer, ratio);
      }
  };
"""
content = content.replace("const startDubbing = async () => {", helper_func + "\n  const startDubbing = async () => {")

# 3. Replace all await timeStretchBuffer(...) with await applyTimeStretch(...)
# Note: be careful not to replace anything else, but looking at the file, all timeStretchBuffer calls inside startDubbing are for the omnivoice block.
content = content.replace("await timeStretchBuffer(", "await applyTimeStretch(")

with open('src/hooks/useDubbingEngine.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done patching stretch logic!")
