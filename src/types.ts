export interface SessionState {
  status: "Idle" | "Active";
  blocked_apps: string[];
  blocked_websites: string[];
  duration_secs: number;
  remaining_secs: number;
  hosts_backup: string | null;
}

export type DurationPreset = {
  label: string;
  mins: number;
};

export interface SessionPreset {
  id: number;
  name: string;
  blocked_apps: string[];
  blocked_websites: string[];
  duration_secs: number;
  created_at: number;
}
