"use client";

import { useTranslations } from "next-intl";
import { BEAD_PALETTE } from "@/utils/beadColors";
import {
  BrushIcon,
  EraserIcon,
  EyedropperIcon,
  FillIcon,
  PanIcon,
  RedoIcon,
  TrashIcon,
  UndoIcon,
  WandIcon,
} from "./icons";

export type EditorTool = "brush" | "eraser" | "eyedropper" | "fill" | "pan";

interface EditorToolbarProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  brushColorId: number;
  recentColorIds: number[];
  onSelectColor: (id: number) => void;
  onOpenPalette: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  onAutoFill: () => void;
  autoFillPending: boolean;
  hasUnderlay: boolean;
  autoFillDisabled?: boolean;
}

const TOOL_BUTTON_BASE =
  "flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-[transform,box-shadow,color,border-color,background-color] duration-150";
const TOOL_BUTTON_INACTIVE = `${TOOL_BUTTON_BASE} border-clay-border bg-surface text-text-secondary shadow-button-secondary hover:text-text-primary active:translate-y-[3px] active:shadow-button-secondary-pressed`;
const TOOL_BUTTON_ACTIVE = `${TOOL_BUTTON_BASE} border-primary-light bg-primary text-primary-ink shadow-button hover:bg-primary-dark active:translate-y-1 active:shadow-button-pressed`;

export function EditorToolbar({
  tool,
  onToolChange,
  brushColorId,
  recentColorIds,
  onSelectColor,
  onOpenPalette,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearAll,
  onAutoFill,
  autoFillPending,
  hasUnderlay,
  autoFillDisabled = false,
}: EditorToolbarProps) {
  const t = useTranslations("editor");
  const brushColor = BEAD_PALETTE[brushColorId];

  const tools: { key: EditorTool; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "brush", label: t("toolBrush"), Icon: BrushIcon },
    { key: "eraser", label: t("toolEraser"), Icon: EraserIcon },
    { key: "eyedropper", label: t("toolEyedropper"), Icon: EyedropperIcon },
    { key: "fill", label: t("toolFill"), Icon: FillIcon },
    { key: "pan", label: t("toolPan"), Icon: PanIcon },
  ];

  return (
    <div
      className="flex w-full flex-wrap items-center justify-center gap-2"
      role="group"
      aria-label={t("toolGroupAria")}
    >
      {/* 当前颜色 + 最近使用 */}
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label={t("currentColorAria", { id: brushColor?.id ?? "-" })}
        title={brushColor?.id}
        className={`${TOOL_BUTTON_INACTIVE} relative`}
      >
        <span
          className="h-6 w-6 rounded-full border border-gray-200"
          style={{ backgroundColor: brushColor?.hex ?? "#fff" }}
        />
      </button>
      {recentColorIds.slice(0, 4).map((id) => {
        const color = BEAD_PALETTE[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectColor(id)}
            aria-label={t("swatchAria", { id: color?.id ?? String(id) })}
            title={color?.id}
            className={`${TOOL_BUTTON_INACTIVE} hidden sm:flex`}
          >
            <span
              className="h-6 w-6 rounded-full border border-gray-200"
              style={{ backgroundColor: color?.hex ?? "#fff" }}
            />
          </button>
        );
      })}

      <span className="mx-1 hidden h-8 w-[3px] rounded-full bg-clay-border sm:block" />

      {/* 工具 */}
      {tools.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onToolChange(key)}
          aria-pressed={tool === key}
          aria-label={label}
          title={label}
          className={tool === key ? TOOL_BUTTON_ACTIVE : TOOL_BUTTON_INACTIVE}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}

      <span className="mx-1 hidden h-8 w-[3px] rounded-full bg-clay-border sm:block" />

      {/* 撤销 / 重做 / 自动填充 / 清空 */}
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={t("undo")}
        title={t("undo")}
        className={`${TOOL_BUTTON_INACTIVE} disabled:pointer-events-none disabled:opacity-40`}
      >
        <UndoIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label={t("redo")}
        title={t("redo")}
        className={`${TOOL_BUTTON_INACTIVE} disabled:pointer-events-none disabled:opacity-40`}
      >
        <RedoIcon className="h-5 w-5" />
      </button>
      {hasUnderlay && (
        <button
          type="button"
          onClick={onAutoFill}
          disabled={autoFillPending || autoFillDisabled}
          aria-label={t("autoFill")}
          title={t("autoFill")}
          className={`${TOOL_BUTTON_INACTIVE} disabled:pointer-events-none disabled:opacity-40`}
        >
          {autoFillPending ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary-strong" />
          ) : (
            <WandIcon className="h-5 w-5" />
          )}
        </button>
      )}
      <button
        type="button"
        onClick={onClearAll}
        aria-label={t("clearAll")}
        title={t("clearAll")}
        className={TOOL_BUTTON_INACTIVE}
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
