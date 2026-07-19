import { useState } from "react";
import { Globe, Plus, X } from "@phosphor-icons/react";

interface Props {
  websites: string[];
  onChange: (websites: string[]) => void;
}

export function BlockedWebsites({ websites, onChange }: Props) {
  const [input, setInput] = useState("");

  const addWebsite = () => {
    const domain = input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (domain && !websites.includes(domain)) {
      onChange([...websites, domain]);
      setInput("");
    }
  };

  const removeWebsite = (domain: string) => {
    onChange(websites.filter((w) => w !== domain));
  };

  return (
    <div className="mb-7">
      {/* Input at top — stays put */}
      <div className="flex gap-1.5 items-center">
        <input
          type="text"
          placeholder="twitter.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addWebsite()}
          className="flex-1 border-0 outline-none bg-input rounded-lg px-3 py-2 text-[15px] text-ink placeholder:text-ink-faint focus:bg-surface focus:ring-2 focus:ring-accent"
        />
        <button
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-accent text-sm font-medium rounded-lg border-0 cursor-pointer hover:bg-input transition-colors duration-150 whitespace-nowrap"
          onClick={addWebsite}
        >
          <Plus size={15} weight="bold" />
          Add
        </button>
      </div>

      {/* List below — grows without pushing input */}
      {websites.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {websites.map((site) => (
            <span
              key={site}
              className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-input rounded-full text-[13px] font-medium text-ink whitespace-nowrap max-w-[220px] [animation:tag-in_200ms_cubic-bezier(0.4,0,0.2,1)]"
            >
              <Globe size={12} weight="regular" className="text-ink-muted shrink-0" />
              <span className="overflow-hidden text-ellipsis">{site}</span>
              <button
                className="inline-flex items-center justify-center w-4 h-4 border-0 bg-black/10 text-ink-muted rounded-full cursor-pointer shrink-0 transition-colors duration-100 hover:bg-danger hover:text-white"
                onClick={() => removeWebsite(site)}
                aria-label={`Remove ${site}`}
              >
                <X size={10} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}

      {websites.length > 0 && (
        <p className="text-xs text-ink-faint mt-2 pl-1 leading-relaxed">
          Hosts file will be modified during the session. Requires admin privileges.
        </p>
      )}
    </div>
  );
}
