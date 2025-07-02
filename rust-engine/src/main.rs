// rust-engine/src/main.rs
use std::fs;
use std::path::Path;
use std::process::Stdio;
use serde::Deserialize;
use tokio::{io::{AsyncBufReadExt, BufReader}, process::Command};

#[derive(Deserialize)]
struct RunRequest {
    engine: String,
    url: String,
}

#[derive(Deserialize)]
struct EngineConfig {
    name: String,
    command: String,
    args: Vec<String>,
}

#[tokio::main]
async fn main() {
    use std::io::{BufRead, BufReader};

    let stdin = std::io::stdin();
    let mut reader = BufReader::new(stdin);
    let mut input = String::new();
    while reader.read_line(&mut input).unwrap_or(0) > 0 {
        if let Ok(req) = serde_json::from_str::<RunRequest>(&input.trim()) {
            run_engine(req).await;
        }
        input.clear();
    }
}

async fn run_engine(req: RunRequest) {
    let config_path = format!("engines/{}.json", req.engine);
    let config_str = fs::read_to_string(&config_path).expect("Engine config missing");
    let engine: EngineConfig = serde_json::from_str(&config_str).expect("Invalid engine config");

    let args: Vec<String> = engine.args.iter()
        .map(|arg| arg.replace("${url}", &req.url))
        .collect();

    let mut cmd = Command::new(&engine.command);
    cmd.args(&args)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    println!("Launching: {} {:?}", engine.command, args);

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to start: {}", e);
            return;
        }
    };

    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout).lines();
        tokio::pin!(reader);
        while let Some(Ok(line)) = reader.next_line().await {
            println!("{}", line);
        }
    }

    if let Some(stderr) = child.stderr.take() {
        let reader = BufReader::new(stderr).lines();
        tokio::pin!(reader);
        while let Some(Ok(line)) = reader.next_line().await {
            eprintln!("{}", line);
        }
    }

    let _ = child.wait().await;
}
