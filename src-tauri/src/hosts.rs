use std::fs;

const HOSTS_PATH: &str = "C:\\Windows\\System32\\drivers\\etc\\hosts";
const MARKER: &str = "# --- added-by-focusapp ---";
const MARKER_END: &str = "# --- end-focusapp ---";

pub fn marker_present() -> bool {
    let content = fs::read_to_string(HOSTS_PATH).unwrap_or_default();
    content.contains(MARKER)
}

pub fn backup_hosts() -> Option<String> {
    fs::read_to_string(HOSTS_PATH).ok()
}

#[allow(dead_code)]
pub fn restore_hosts(backup: &str) -> Result<(), String> {
    fs::write(HOSTS_PATH, backup).map_err(|e| format!("Failed to restore hosts file: {e}.\nEnsure the app is running as administrator."))
}

pub fn build_hosts_entries(domains: &[String]) -> String {
    let mut entries = String::from(&format!("{MARKER}\n"));
    for domain in domains {
        let bare = domain.trim().to_lowercase();
        if bare.is_empty() {
            continue;
        }
        entries.push_str(&format!("127.0.0.1  {bare}\n"));
        if !bare.starts_with("www.") {
            entries.push_str(&format!("127.0.0.1  www.{bare}\n"));
        }
    }
    entries.push_str(&format!("{MARKER_END}\n"));
    entries
}

pub fn apply_hosts(domains: &[String]) -> Result<String, String> {
    let backup = backup_hosts().ok_or("Failed to read current hosts file")?;
    let existing = fs::read_to_string(HOSTS_PATH).unwrap_or_default();

    let cleaned = remove_focusapp_entries(&existing);
    let new_entries = build_hosts_entries(domains);
    let mut new_content = cleaned.trim_end().to_string();
    new_content.push('\n');
    new_content.push_str(&new_entries);

    fs::write(&HOSTS_PATH, &new_content)
        .map_err(|e| format!("Failed to write hosts file: {e}.\nThis operation requires administrator privileges. Please run the app as administrator."))?;

    Ok(backup)
}

pub fn remove_focusapp_entries(content: &str) -> String {
    let mut result = String::new();
    let mut skipping = false;

    for line in content.lines() {
        if line.trim() == MARKER {
            skipping = true;
            continue;
        }
        if line.trim() == MARKER_END {
            skipping = false;
            continue;
        }
        if !skipping {
            result.push_str(line);
            result.push('\n');
        }
    }

    result
}

pub fn restore_from_backup(backup: &str) -> Result<(), String> {
    let current = fs::read_to_string(HOSTS_PATH).unwrap_or_default();
    let cleaned = remove_focusapp_entries(&current);
    let cleaned_trimmed = cleaned.trim();

    let backup_trimmed = backup.trim();

    if cleaned_trimmed == backup_trimmed {
        fs::write(HOSTS_PATH, backup)
            .map_err(|e| format!("Failed to restore hosts file: {e}"))?;
    } else {
        let merged = merge_hosts(cleaned_trimmed, backup_trimmed);
        fs::write(HOSTS_PATH, &merged)
            .map_err(|e| format!("Failed to restore hosts file: {e}"))?;
    }

    Ok(())
}

fn merge_hosts(current_clean: &str, backup: &str) -> String {
    let backup_entries: Vec<&str> = backup.lines().collect();
    let current_entries: Vec<&str> = current_clean.lines().collect();

    let mut seen = std::collections::HashSet::new();
    let mut merged = Vec::new();

    for line in &backup_entries {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            if !seen.contains(trimmed) {
                merged.push(*line);
                seen.insert(trimmed);
            }
        } else {
            if !seen.contains(&trimmed) {
                merged.push(*line);
                seen.insert(trimmed);
            }
        }
    }

    for line in &current_entries {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if !seen.contains(&trimmed) {
            merged.push(*line);
            seen.insert(trimmed);
        }
    }

    merged.join("\n") + "\n"
}

pub fn cleanup_stale_entries() -> Result<bool, String> {
    if !marker_present() {
        return Ok(false);
    }

    let current = fs::read_to_string(HOSTS_PATH)
        .map_err(|e| format!("Failed to read hosts file: {e}"))?;
    let cleaned = remove_focusapp_entries(&current);

    fs::write(HOSTS_PATH, cleaned)
        .map_err(|e| format!("Failed to clean hosts file: {e}.\nRun as administrator to clean stale entries."))?;

    Ok(true)
}

pub fn elevated_write(domains: &[String]) -> Result<(), String> {
    let entries = build_hosts_entries(domains);

    let ps_script = format!(
        r#"
$content = Get-Content -Path '{HOSTS_PATH}' -Raw
$marker = '{MARKER}'
$markerEnd = '{MARKER_END}'
if ($content -match [regex]::Escape($marker)) {{
    $pattern = "(?s){}.*?{}"
    $content = [regex]::Replace($content, $pattern, "")
}}
$entries = @'
{}'@
Set-Content -Path '{HOSTS_PATH}' -Value ($content.TrimEnd() + "`n" + $entries) -Force
"#,
        MARKER.replace('\'', "''"),
        MARKER_END.replace('\'', "''"),
        entries.replace('\'', "''")
    );

    let temp_script = std::env::temp_dir().join("focus_hosts_write.ps1");
    fs::write(&temp_script, &ps_script)
        .map_err(|e| format!("Failed to create temp script: {e}"))?;

    let result = run_elevated_script(&temp_script);
    let _ = fs::remove_file(&temp_script);
    result
}

pub fn elevated_restore(backup: &str) -> Result<(), String> {
    let backup_escaped = backup.replace('\'', "''");

    let ps_script = format!(
        r#"
$content = @'
{}'@
Set-Content -Path '{HOSTS_PATH}' -Value $content -Force
"#,
        backup_escaped
    );

    let temp_script = std::env::temp_dir().join("focus_hosts_restore.ps1");
    fs::write(&temp_script, &ps_script)
        .map_err(|e| format!("Failed to create temp script: {e}"))?;

    let result = run_elevated_script(&temp_script);
    let _ = fs::remove_file(&temp_script);
    result
}

pub fn elevated_cleanup() -> Result<(), String> {
    let ps_script = format!(
        r#"
$content = Get-Content -Path '{HOSTS_PATH}' -Raw -ErrorAction SilentlyContinue
if ($content -match [regex]::Escape('{MARKER}')) {{
    $pattern = "(?s){}.*?{}"
    $content = [regex]::Replace($content, $pattern, "")
    Set-Content -Path '{HOSTS_PATH}' -Value $content.TrimEnd() -Force
}}
"#,
        MARKER.replace('\'', "''"),
        MARKER_END.replace('\'', "''")
    );

    let temp_script = std::env::temp_dir().join("focus_hosts_cleanup.ps1");
    fs::write(&temp_script, &ps_script)
        .map_err(|e| format!("Failed to create temp script: {e}"))?;

    let result = run_elevated_script(&temp_script);
    let _ = fs::remove_file(&temp_script);
    result
}

fn run_elevated_script(script_path: &std::path::Path) -> Result<(), String> {
    let ps_args = format!(
        "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File \"{}\"",
        script_path.display()
    );

    let status = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            &format!("Start-Process powershell -Verb RunAs -ArgumentList '{ps_args}' -WindowStyle Hidden -Wait"),
        ])
        .status();

    match status {
        Ok(s) if s.success() => Ok(()),
        Ok(_) => Err("Elevated operation was cancelled or failed.".to_string()),
        Err(e) => Err(format!("Failed to launch elevated process: {e}")),
    }
}
