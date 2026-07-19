use serde::Serialize;
use std::collections::HashSet;
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Threading::{
    OpenProcess, TerminateProcess, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE,
};
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
    TH32CS_SNAPPROCESS,
};

#[derive(Debug, Clone, Serialize)]
pub struct ProcessInfo {
    pub name: String,
    pub pid: u32,
}

pub fn list_running_processes() -> Vec<ProcessInfo> {
    let mut processes = Vec::new();

    unsafe {
        let snapshot = match CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) {
            Ok(s) => s,
            Err(_) => return processes,
        };

        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let name = extract_process_name_wide(&entry.szExeFile);
                if !name.is_empty() {
                    processes.push(ProcessInfo {
                        name,
                        pid: entry.th32ProcessID,
                    });
                }
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }

        let _ = CloseHandle(snapshot);
    }

    processes.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    processes.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());
    processes
}

fn extract_process_name_wide(raw: &[u16]) -> String {
    let end = raw.iter().position(|&c| c == 0).unwrap_or(raw.len());
    let slice = &raw[..end];
    String::from_utf16_lossy(slice)
}

pub fn kill_process_by_name(name: &str) -> Result<u32, String> {
    let name_lower = name.to_lowercase();
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }
        .map_err(|e| format!("Failed to create process snapshot: {e}"))?;

    let mut entry: PROCESSENTRY32W = unsafe { std::mem::zeroed() };
    entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

    let mut killed_count = 0u32;

    unsafe {
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let proc_name = extract_process_name_wide(&entry.szExeFile);
                if proc_name.to_lowercase() == name_lower && entry.th32ProcessID > 0 {
                    if terminate_pid(entry.th32ProcessID) {
                        killed_count += 1;
                    }
                }
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
    }

    if killed_count > 0 {
        Ok(killed_count)
    } else {
        Err(format!("No running process found matching '{name}'"))
    }
}

pub fn kill_blocked_processes(blocked: &[String]) -> Vec<String> {
    let mut terminated = Vec::new();
    let blocked_lower: HashSet<String> = blocked.iter().map(|s| s.to_lowercase()).collect();

    let snapshot = match unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) } {
        Ok(s) => s,
        Err(_) => return terminated,
    };

    let mut entry: PROCESSENTRY32W = unsafe { std::mem::zeroed() };
    entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

    unsafe {
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let proc_name = extract_process_name_wide(&entry.szExeFile);
                if blocked_lower.contains(&proc_name.to_lowercase()) && entry.th32ProcessID > 0 {
                    if terminate_pid(entry.th32ProcessID) {
                        terminated.push(proc_name);
                    }
                }
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
    }

    terminated
}

unsafe fn terminate_pid(pid: u32) -> bool {
    let handle = OpenProcess(PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
    if let Ok(h) = handle {
        let result = TerminateProcess(h, 1);
        let _ = CloseHandle(h);
        result.is_ok()
    } else {
        false
    }
}
