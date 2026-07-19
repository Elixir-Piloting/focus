use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionPreset {
    pub id: i64,
    pub name: String,
    pub blocked_apps: Vec<String>,
    pub blocked_websites: Vec<String>,
    pub duration_secs: u64,
    pub created_at: i64,
}

static DB: std::sync::OnceLock<Mutex<Option<Connection>>> = std::sync::OnceLock::new();

fn db_path(app: &AppHandle) -> std::path::PathBuf {
    let dir = app.path().app_data_dir().expect("app data dir");
    std::fs::create_dir_all(&dir).ok();
    dir.join("focus.db")
}

pub fn init(app: &AppHandle) {
    let conn = Connection::open(db_path(app)).expect("open db");
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            blocked_apps TEXT NOT NULL,
            blocked_websites TEXT NOT NULL,
            duration_secs INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );",
    )
    .expect("create table");
    *DB.get_or_init(|| Mutex::new(None)).lock().unwrap() = Some(conn);
}

fn with_conn<F, R>(f: F) -> R
where
    F: FnOnce(&Connection) -> R,
{
    let guard = DB.get().unwrap().lock().unwrap();
    f(guard.as_ref().unwrap())
}

pub fn save_session(
    name: &str,
    blocked_apps: &[String],
    blocked_websites: &[String],
    duration_secs: u64,
) -> Result<i64, String> {
    let apps_json = serde_json::to_string(blocked_apps).map_err(|e| e.to_string())?;
    let sites_json = serde_json::to_string(blocked_websites).map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    with_conn(|conn| {
        conn.execute(
            "INSERT INTO sessions (name, blocked_apps, blocked_websites, duration_secs, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![name, apps_json, sites_json, duration_secs, now],
        )
        .map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    })
}

pub fn list_sessions() -> Result<Vec<SessionPreset>, String> {
    with_conn(|conn| {
        let mut stmt = conn
            .prepare("SELECT id, name, blocked_apps, blocked_websites, duration_secs, created_at FROM sessions ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                let apps: String = row.get(2)?;
                let sites: String = row.get(3)?;
                Ok(SessionPreset {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    blocked_apps: serde_json::from_str(&apps).unwrap_or_default(),
                    blocked_websites: serde_json::from_str(&sites).unwrap_or_default(),
                    duration_secs: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r.map_err(|e| e.to_string())?);
        }
        Ok(out)
    })
}

pub fn get_session(id: i64) -> Result<SessionPreset, String> {
    with_conn(|conn| {
        conn.query_row(
            "SELECT id, name, blocked_apps, blocked_websites, duration_secs, created_at FROM sessions WHERE id = ?1",
            params![id],
            |row| {
                let apps: String = row.get(2)?;
                let sites: String = row.get(3)?;
                Ok(SessionPreset {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    blocked_apps: serde_json::from_str(&apps).unwrap_or_default(),
                    blocked_websites: serde_json::from_str(&sites).unwrap_or_default(),
                    duration_secs: row.get(4)?,
                    created_at: row.get(5)?,
                })
            },
        )
        .map_err(|e| e.to_string())
    })
}

pub fn delete_session(id: i64) -> Result<(), String> {
    with_conn(|conn| {
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn update_session(
    id: i64,
    name: &str,
    blocked_apps: &[String],
    blocked_websites: &[String],
    duration_secs: u64,
) -> Result<(), String> {
    let apps_json = serde_json::to_string(blocked_apps).map_err(|e| e.to_string())?;
    let sites_json = serde_json::to_string(blocked_websites).map_err(|e| e.to_string())?;
    with_conn(|conn| {
        conn.execute(
            "UPDATE sessions SET name=?1, blocked_apps=?2, blocked_websites=?3, duration_secs=?4 WHERE id=?5",
            params![name, apps_json, sites_json, duration_secs, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}
