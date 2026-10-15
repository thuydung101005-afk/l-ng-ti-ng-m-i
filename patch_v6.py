import re

panel_file = 'src/components/ReviewPanel.tsx'
with open(panel_file, 'r', encoding='utf-8') as f:
    panel_content = f.read()

# Add prevText and nextText to ReviewQueueItem
old_interface = """export interface ReviewQueueItem {
  index: number;
  original: string;
  shortened: string;
  neededSpeed: number;
}"""

new_interface = """export interface ReviewQueueItem {
  index: number;
  original: string;
  shortened: string;
  neededSpeed: number;
  prevText?: string;
  nextText?: string;
}"""
panel_content = panel_content.replace(old_interface, new_interface)

# Add Context UI to ReviewItemCard
old_ui = """      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Bản gốc (quá dài):</div>
        <div className="text-sm text-gray-300 italic opacity-80">{item.original}</div>
      </div>"""

new_ui = """      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Bản gốc (quá dài):</div>
        {item.prevText && <div className="text-xs text-gray-500 italic opacity-50 mb-1">[Trước: {item.prevText}]</div>}
        <div className="text-sm text-gray-300 italic opacity-80 py-1">{item.original}</div>
        {item.nextText && <div className="text-xs text-gray-500 italic opacity-50 mt-1">[Sau: {item.nextText}]</div>}
      </div>"""
panel_content = panel_content.replace(old_ui, new_ui)

with open(panel_file, 'w', encoding='utf-8') as f:
    f.write(panel_content)

print("ReviewPanel context added")
