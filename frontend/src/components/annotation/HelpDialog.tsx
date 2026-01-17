"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  {
    category: "フレーム操作",
    items: [
      { keys: ["D"], description: "前のフレームへ" },
      { keys: ["F"], description: "次のフレームへ" },
      { keys: ["Ctrl+S"], description: "保存" },
    ],
  },
  {
    category: "モード切替",
    items: [
      { keys: ["Q"], description: "選択/描画モード切替" },
      { keys: ["V"], description: "選択モード" },
      { keys: ["R"], description: "描画モード" },
      { keys: ["Esc"], description: "選択モードに戻る・選択解除" },
    ],
  },
  {
    category: "ラベル選択",
    items: [{ keys: ["1", "〜", "9"], description: "ラベルを番号で選択" }],
  },
  {
    category: "編集操作",
    items: [
      { keys: ["クリック"], description: "BBoxを選択" },
      { keys: ["Tab"], description: "重なったBBoxを順次選択" },
      { keys: ["Shift+Tab"], description: "重なったBBoxを逆順選択" },
      { keys: ["ドラッグ"], description: "選択中のBBoxを移動" },
      { keys: ["角をドラッグ"], description: "BBoxをリサイズ" },
      {
        keys: ["Shift+リサイズ"],
        description: "アスペクト比を維持してリサイズ",
      },
      { keys: ["Delete", "Backspace"], description: "選択中のBBoxを削除" },
    ],
  },
  {
    category: "表示",
    items: [{ keys: ["H"], description: "ラベル表示切替（全て/選択中のみ）" }],
  },
  {
    category: "履歴",
    items: [
      { keys: ["Ctrl+Z"], description: "元に戻す (Undo)" },
      { keys: ["Ctrl+Y", "Ctrl+Shift+Z"], description: "やり直す (Redo)" },
    ],
  },
  {
    category: "ビュー操作",
    items: [
      {
        keys: ["Space+ドラッグ"],
        description: "一時的にパン（どのモードでも）",
      },
      { keys: ["ホイール"], description: "ズーム" },
    ],
  },
];

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
            キーボードショートカット
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {section.category}
              </h3>
              <div className="space-y-1.5">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center gap-1">
                          {keyIdx > 0 && (
                            <span className="text-muted-foreground text-xs">
                              /
                            </span>
                          )}
                          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border font-mono">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
          ヒント:{" "}
          <kbd className="px-1 py-0.5 bg-muted rounded border text-xs font-mono">
            ?
          </kbd>{" "}
          キーでこのダイアログを開けます
        </p>
      </DialogContent>
    </Dialog>
  );
}
