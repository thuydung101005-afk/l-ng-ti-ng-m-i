import re

app_file = 'src/App.tsx'
with open(app_file, 'r', encoding='utf-8') as f:
    app_content = f.read()

old_review = """          <ReviewPanel 
            items={engine.reviewQueueItems || []} 
            onApprove={engine.handleApprove}
            maxSpeed={engine.maxAutoFitSpeed}
            totalSubs={engine.totalSubsCount}
          />"""

new_review = """          <ReviewPanel 
            items={engine.reviewQueueItems || []} 
            onApprove={engine.handleApprove}
            onRewrite={engine.handleRewrite}
            maxSpeed={engine.maxAutoFitSpeed}
            totalSubs={engine.totalSubsCount}
          />"""

app_content = app_content.replace(old_review, new_review)

with open(app_file, 'w', encoding='utf-8') as f:
    f.write(app_content)

print("App.tsx patched")
