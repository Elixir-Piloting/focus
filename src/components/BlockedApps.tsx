import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { AppWindow, FolderOpen, Plus, X } from "@phosphor-icons/react";
import { Button } from "./Button";
import { Input } from "./Input";

interface Props {
  apps: string[];
  onChange: (apps: string[]) => void;
}

export function BlockedApps({ apps, onChange }: Props) {
  const [manualInput, setManualInput] = useState("");

  const addApp = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !apps.includes(trimmed)) {
      onChange([...apps, trimmed]);
    }
  };

  const removeApp = (name: string) => {
    onChange(apps.filter((a) => a !== name));
  };

  const addManual = () => {
    let name = manualInput.trim();
    if (name) {
      if (!name.toLowerCase().endsWith(".exe")) {
        name += ".exe";
      }
      addApp(name);
      setManualInput("");
    }
  };

  const pickFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "Executables", extensions: ["exe"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (selected) {
      const path = typeof selected === "string" ? selected : selected;
      const fileName = path.split(/[/\\]/).pop() || path;
      addApp(fileName);
    }
  };

  return (
    <div className="mb-7">
      {/* Input at top — stays put */}
      <div className="flex gap-1.5 items-center">
        <Input
          type="text"
          placeholder="chrome.exe"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addManual()}
          className="flex-1 py-2"
        />
        {manualInput.trim() ? (
          <Button
            variant="ghost-accent" size="md"
            onClick={addManual}
          >
            <Plus size={15} weight="bold" />
            Add
          </Button>
        ) : (
          <Button
            variant="ghost-accent" size="md"
            onClick={pickFile}
          >
            <FolderOpen size={15} weight="regular" />
            Browse
          </Button>
        )}
      </div>

      {/* List below — grows without pushing input */}
      {apps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {apps.map((app) => (
            <span
              key={app}
              className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-input rounded-full text-[13px] font-medium text-ink whitespace-nowrap max-w-[220px] [animation:tag-in_200ms_cubic-bezier(0.4,0,0.2,1)] shadow-inset-sm"
            >
              <AppWindow size={12} weight="regular" className="text-ink-muted shrink-0" />
              <span className="overflow-hidden text-ellipsis">{app}</span>
              <button
                className="inline-flex items-center justify-center w-4 h-4 border-0 bg-black/10 text-ink-muted rounded-full cursor-pointer shrink-0 transition-colors duration-100 hover:bg-danger hover:text-white shadow-inset-sm"
                onClick={() => removeApp(app)}
                aria-label={`Remove ${app}`}
              >
                <X size={10} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
